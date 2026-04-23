#!/usr/bin/env python3
"""
generate_graphs.py (pilot) — homophily only, all gazorps same group
outputs to exp_1_pilot/stimuli/graphs/
"""

import numpy as np
import networkx as nx
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ── configurable ─────────────────────────────────────────────
NUM_GRAPHS   = 5
N            = 12        # number of nodes (gazorps)
N_EDGES      = 15        # exact number of edges required

# stochastic block model params
M            = 2         # number of behavior communities
N_PER_BEH    = 6         # nodes per behavior community (must satisfy M * N_PER_BEH == N)
P_IN = 0.357             # within-community edge prob  (tuned for N_EDGES=15)
P_OUT= 0.119             # between-community edge prob (tuned for N_EDGES=15)

# minimum ρ(E→B) for selecting graphs
RHO_EB_MIN   = 0.15      # E=edge, B=behavior: min correlation (network proximity → shared food)

# other selection criteria
MIN_DEGREE   = 2
MAX_ATTEMPTS = 50000
# ─────────────────────────────────────────────────────────────


def compute_rho_EB(A, B):
    # ρ(E→B): P(same behavior | connected) − P(same behavior | not connected)
    se, sn = [], []
    for i in range(N):
        for j in range(i + 1, N):
            same = int(B[i] == B[j])
            (se if A[i, j] == 1 else sn).append(same)
    if not se or not sn:
        return 0.0
    return float(np.mean(se) - np.mean(sn))


def try_make_graph(seed):
    rng = np.random.default_rng(seed)

    latent_B = np.array([b for b in range(M) for _ in range(N_PER_BEH)])
    rng.shuffle(latent_B)

    A = np.zeros((N, N), dtype=int)
    for i in range(N):
        for j in range(i + 1, N):
            p = P_IN if latent_B[i] == latent_B[j] else P_OUT
            if rng.random() < p:
                A[i, j] = A[j, i] = 1

    G = nx.from_numpy_array(A)
    edge_count = int(A.sum() // 2)

    if not nx.is_connected(G):                         return None
    if min(dict(G.degree()).values()) < MIN_DEGREE:    return None
    if edge_count != N_EDGES:                          return None

    B_hom    = latent_B.copy()
    C_hom    = np.zeros(N, dtype=int)   # all same group (all blue)
    rho_EB   = compute_rho_EB(A, B_hom)
    if rho_EB < RHO_EB_MIN:
        return None

    edges     = [[int(i), int(j)] for i in range(N) for j in range(i+1, N) if A[i, j] == 1]
    non_edges = [[int(i), int(j)] for i in range(N) for j in range(i+1, N) if A[i, j] == 0]
    rng2      = np.random.default_rng(seed + 99999)
    n_er      = min(12, len(edges), len(non_edges))
    er_trials = (
        [{"pair": edges[i],     "true_edge": True}  for i in rng2.choice(len(edges),     n_er, replace=False)] +
        [{"pair": non_edges[i], "true_edge": False} for i in rng2.choice(len(non_edges), n_er, replace=False)]
    )

    return {
        "graph_id": None,
        "seed": int(seed),
        "pilot": True,
        "N": N, "M": M, "p_in": P_IN, "p_out": P_OUT,
        "adjacency": A.tolist(),
        "edges": edges,
        "homophily_condition": {
            "group":  C_hom.tolist(),
            "behavior": B_hom.tolist(),
            "rho_EB":   round(rho_EB, 4),
            "rho_CB":   0.0
        },
        "category_condition": None,
        "epsilon": None,
        "edge_recognition_trials": er_trials
    }


# ── image generation ──────────────────────────────────────────
# color = group (all blue gazorp in pilot); shape = behavior
GRP_COLORS = ['#2596be', '#f14d4d']   # group 0 = blue gazorp / group 1 = red gazorp

NOTATION_KEY = (
    "Notation\n"
    "  E  =  edge (friendship)\n"
    "  B  =  behavior (food pref)\n"
    "  C  =  category (group)\n\n"
    "  color  =  group (C)\n"
    "    all group 0 — pilot\n"
    "    (no category info)\n"
    "  shape  =  behavior (B)\n"
    "    ●  behavior 0\n"
    "    ■  behavior 1\n\n"
    "  ρ(E→B)  =  P(same B | friends)\n"
    "            − P(same B | not friends)"
)


def draw_graph(ax, A, behavior, group, edge_list, title, info_lines):
    G   = nx.from_numpy_array(A)
    pos = nx.spring_layout(G, seed=42, k=1.8 / np.sqrt(N))
    # shift nodes into upper 80% of axes so bottom-left text box doesn't overlap
    xs = np.array([p[0] for p in pos.values()])
    ys = np.array([p[1] for p in pos.values()])
    xs = (xs - xs.min()) / (xs.max() - xs.min() + 1e-9) * 0.85 + 0.05  # [0.05, 0.90]
    ys = (ys - ys.min()) / (ys.max() - ys.min() + 1e-9) * 0.70 + 0.25  # [0.25, 0.95]
    pos = {i: (xs[i], ys[i]) for i in pos}
    ax.set_xlim(0, 1); ax.set_ylim(0, 1)
    nx.draw_networkx_edges(G, pos, edgelist=edge_list, ax=ax,
                           edge_color='#aaaaaa', width=1.4, alpha=0.7)
    # draw circles (behavior=0) and squares (behavior=1), colored by group
    for beh, shape in [(0, 'o'), (1, 's')]:
        nodes = [i for i in range(N) if behavior[i] == beh]
        if nodes:
            nx.draw_networkx_nodes(G, pos, nodelist=nodes, ax=ax,
                                   node_color=[GRP_COLORS[group[i]] for i in nodes],
                                   node_shape=shape, node_size=460,
                                   linewidths=1.2, edgecolors='#444')
    nx.draw_networkx_labels(G, pos, ax=ax,
                            labels={i: str(i) for i in range(N)},
                            font_size=8, font_color='white', font_weight='bold')
    ax.set_title(title, fontsize=11, fontweight='bold', pad=8)
    ax.text(0.01, 0.01, '\n'.join(info_lines), transform=ax.transAxes,
            fontsize=8, verticalalignment='bottom', family='monospace',
            color='#333', bbox=dict(boxstyle='round,pad=0.35', fc='#f5f5f5', ec='#ccc'))
    ax.axis('off')


def save_graph_image(g, out_dir):
    A     = np.array(g['adjacency'])
    edges = [(e[0], e[1]) for e in g['edges']]
    hom   = g['homophily_condition']
    gid   = g['graph_id']

    fig, axes = plt.subplots(1, 2, figsize=(12, 5.5),
                             gridspec_kw={'width_ratios': [2, 1]})
    fig.patch.set_facecolor('#fafafa')

    info = [
        f"graph {gid:02d}  |  seed={g['seed']}  |  edges={len(edges)}",
        f"ρ(E→B) = {hom['rho_EB']:+.3f}",
    ]
    draw_graph(axes[0], A, hom['behavior'], hom['group'],
               edges, f"graph {gid:02d} (pilot — homophily)", info)
    axes[0].legend(handles=[mpatches.Patch(color=GRP_COLORS[i], label=f'group {i}')
                             for i in range(2)],
                   loc='upper right', fontsize=8, framealpha=0.85)

    axes[1].axis('off')
    axes[1].text(0.05, 0.95, NOTATION_KEY, transform=axes[1].transAxes,
                 fontsize=9, verticalalignment='top', family='monospace',
                 color='#333', bbox=dict(boxstyle='round,pad=0.6', fc='#f0f0f0', ec='#bbb'))

    plt.tight_layout()
    img_path = os.path.join(out_dir, f"graph_{gid:02d}.png")
    plt.savefig(img_path, dpi=130, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"  img  {img_path}")


# ── main ──────────────────────────────────────────────────────
out_dir = os.path.join(os.path.dirname(__file__), '..', 'stimuli', 'graphs')
os.makedirs(out_dir, exist_ok=True)

graphs = []
seed   = 0
while len(graphs) < NUM_GRAPHS and seed < MAX_ATTEMPTS:
    g = try_make_graph(seed)
    if g is not None:
        g["graph_id"] = len(graphs) + 1
        graphs.append(g)
        hom = g["homophily_condition"]
        print(
            f"graph {g['graph_id']:02d} | seed={seed:5d} | "
            f"edges={len(g['edges']):2d} | "
            f"ρ(E→B)={hom['rho_EB']:+.3f}"
        )
    seed += 1

if len(graphs) < NUM_GRAPHS:
    print(f"\nWARNING: only found {len(graphs)}/{NUM_GRAPHS} valid graphs in {seed} attempts")
else:
    print(f"\nfound all {NUM_GRAPHS} graphs in {seed} attempts")

for g in graphs:
    path = os.path.join(out_dir, f"graph_{g['graph_id']:02d}.json")
    with open(path, 'w') as f:
        json.dump(g, f, indent=2)
    print(f"saved {path}")
    save_graph_image(g, out_dir)
