#!/usr/bin/env python3
"""
generate_graphs.py — produces NUM_GRAPHS canonical graph JSONs
two conditions per graph: homophily (E→B) and category (C→B)
outputs to exp_1/stimuli/graphs/
"""

import numpy as np
import networkx as nx
import json, os
from multiprocessing import Pool, cpu_count
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ── configurable ─────────────────────────────────────────────
NUM_GRAPHS   = 5
N            = 8        # number of nodes (gazorps)
N_EDGES      = 10       # exact number of edges required

# stochastic block model params
M            = 2         # number of behavior communities
N_PER_BEH    = 4        # nodes per behavior community (must satisfy M * N_PER_BEH == N)
K            = 2         # number of groups
N_PER_GROUP  = 4         # nodes per group (must satisfy K * N_PER_GROUP == N)
P_IN = 0.58              # within-community edge prob  (tuned for N_EDGES=10, N=8)
P_OUT= 0.19              # between-community edge prob (tuned for N_EDGES=10, N=8)

# correlation thresholds
RHO_EB_MIN   = 0.4     # homophily cond: min ρ(E→B) — edge predicts behavior
RHO_CB_MIN   = 0.4      # category cond:  min ρ(C→B) — group predicts behavior
RHO_OTHER_MAX= 0.05      # max |ρ| for the non-signal cue in each condition
                         # 0.05 is the practical floor for N=8, E=10:
                         #   rho_CB_hom = 0 is achievable (x=2 overlap)
                         #   min |rho_EB_cat| = 0.044 (k=4 same-beh edges)

# other selection criteria
MIN_DEGREE         = 2
group_BALANCE_MAX= 0.30   # max |mean_deg_s0 − mean_deg_s1| / mean_deg
MAX_ATTEMPTS       = 5000000
# ─────────────────────────────────────────────────────────────


# precompute upper-triangle index pairs once
_PI, _PJ = np.triu_indices(N, k=1)


def compute_rho_EB(A, B):
    # ρ(E→B): P(same behavior | connected) − P(same behavior | not connected)
    same = (B[_PI] == B[_PJ])
    conn = A[_PI, _PJ].astype(bool)
    se, sn = same[conn], same[~conn]
    if len(se) == 0 or len(sn) == 0:
        return 0.0
    return float(se.mean() - sn.mean())


def compute_rho_CB(C, B):
    # ρ(C→B): P(group matches behavior) − 0.5
    return float((B == C).mean() - 0.5)


def try_make_graph(seed):
    rng = np.random.default_rng(seed)

    latent_B = np.array([b for b in range(M) for _ in range(N_PER_BEH)])
    rng.shuffle(latent_B)

    # vectorized adjacency generation
    same_beh = latent_B[_PI] == latent_B[_PJ]
    probs    = np.where(same_beh, P_IN, P_OUT)
    mask     = rng.random(len(_PI)) < probs
    A = np.zeros((N, N), dtype=int)
    A[_PI[mask], _PJ[mask]] = 1
    A[_PJ[mask], _PI[mask]] = 1

    edge_count = int(mask.sum())
    if edge_count != N_EDGES:                          return None   # cheap check first

    G = nx.from_numpy_array(A)
    if not nx.is_connected(G):                         return None
    if min(dict(G.degree()).values()) < MIN_DEGREE:    return None

    # homophily condition: behavior = latent, group = random (orthogonal)
    B_hom      = latent_B.copy()
    group_pool = np.array([g for g in range(K) for _ in range(N_PER_GROUP)])
    C_hom      = group_pool.copy()
    rng.shuffle(C_hom)

    rho_EB_hom = compute_rho_EB(A, B_hom)
    if rho_EB_hom < RHO_EB_MIN:                       return None
    rho_CB_hom = compute_rho_CB(C_hom, B_hom)
    if abs(rho_CB_hom) > RHO_OTHER_MAX:               return None

    # group balance check
    deg      = A.sum(axis=1)
    mean_deg = float(deg.mean())
    if abs(deg[C_hom == 0].mean() - deg[C_hom == 1].mean()) / mean_deg > group_BALANCE_MAX:
        return None

    # category condition: group = fresh shuffle, behavior derived from group
    epsilon = float(np.clip(0.5 - rho_EB_hom, 0.0, 0.5))
    C_cat   = group_pool.copy()
    rng.shuffle(C_cat)
    flips   = rng.random(N) < epsilon
    B_cat   = np.where(flips, 1 - C_cat, C_cat).astype(int)

    if np.sum(B_cat == 0) != N_PER_BEH:               return None   # enforce 4/4 balance
    rho_CB_cat = compute_rho_CB(C_cat, B_cat)
    if rho_CB_cat < RHO_CB_MIN:                       return None
    rho_EB_cat = compute_rho_EB(A, B_cat)
    if abs(rho_EB_cat) > RHO_OTHER_MAX:               return None

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
        "N": N, "M": M, "K": K, "p_in": P_IN, "p_out": P_OUT,
        "adjacency": A.tolist(),
        "edges": edges,
        "homophily_condition": {
            "group":  C_hom.tolist(),
            "behavior": B_hom.tolist(),
            "rho_EB":   round(rho_EB_hom, 4),
            "rho_CB":   round(rho_CB_hom, 4)
        },
        "category_condition": {
            "group":  C_cat.tolist(),
            "behavior": B_cat.tolist(),
            "rho_EB":   round(rho_EB_cat, 4),
            "rho_CB":   round(rho_CB_cat, 4)
        },
        "epsilon": round(epsilon, 4),
        "edge_recognition_trials": er_trials
    }


# ── image generation ──────────────────────────────────────────
# color = group/species (matches actual gazorp colors)
# shape = behavior: circle (0) vs square (1)
GRP_COLORS = ['#1fb092', '#ee5e33']   # group 0 = green alien / group 1 = orange alien

NOTATION_KEY = (
    "Notation\n"
    "  E  =  edge (friendship)\n"
    "  B  =  behavior (food pref)\n"
    "  C  =  category (group)\n\n"
    "  color  =  group (C)\n"
    "    ■  group 0  (green alien)\n"
    "    ■  group 1  (orange alien)\n"
    "  shape  =  behavior (B)\n"
    "    ●  behavior 0\n"
    "    ■  behavior 1\n\n"
    "  ρ(E→B)  =  P(same B | friends)\n"
    "            − P(same B | not friends)\n\n"
    "  ρ(C→B)  =  P(C matches B) − 0.5"
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
    cat   = g['category_condition']
    gid   = g['graph_id']

    fig, axes = plt.subplots(1, 3, figsize=(16, 5.5),
                             gridspec_kw={'width_ratios': [2, 2, 1]})
    fig.patch.set_facecolor('#fafafa')

    # left: homophily condition — ρ(E→B) always first, ρ(C→B) always second
    info_hom = [
        f"graph {gid:02d}  |  seed={g['seed']}  |  edges={len(edges)}",
        f"ρ(E→B) = {hom['rho_EB']:+.3f}",
        f"ρ(C→B) = {hom['rho_CB']:+.3f}",
    ]
    draw_graph(axes[0], A, hom['behavior'], hom['group'],
               edges, f"graph {gid:02d} — homophily cond", info_hom)

    # middle: category condition — same order: ρ(E→B) first, ρ(C→B) second
    info_cat = [
        f"ε = {g['epsilon']:.3f}",
        f"ρ(E→B) = {cat['rho_EB']:+.3f}",
        f"ρ(C→B) = {cat['rho_CB']:+.3f}",
    ]
    draw_graph(axes[1], A, cat['behavior'], cat['group'],
               edges, f"graph {gid:02d} — category cond", info_cat)

    # shared group legend
    grp_legend = [mpatches.Patch(color=GRP_COLORS[i], label=f'group {i}') for i in range(2)]
    axes[0].legend(handles=grp_legend, loc='upper right', fontsize=8, framealpha=0.85)
    axes[1].legend(handles=grp_legend, loc='upper right', fontsize=8, framealpha=0.85)

    # right: notation key
    axes[2].axis('off')
    axes[2].text(0.05, 0.95, NOTATION_KEY, transform=axes[2].transAxes,
                 fontsize=9, verticalalignment='top', family='monospace',
                 color='#333', bbox=dict(boxstyle='round,pad=0.6', fc='#f0f0f0', ec='#bbb'))

    plt.tight_layout()
    img_path = os.path.join(out_dir, f"graph_{gid:02d}.png")
    plt.savefig(img_path, dpi=130, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print(f"  img  {img_path}")


# ── main ──────────────────────────────────────────────────────
if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'stimuli', 'graphs')
    os.makedirs(out_dir, exist_ok=True)

    BATCH = 4096   # seeds per parallel chunk

    graphs = []
    seed   = 0
    with Pool(cpu_count()) as pool:
        while len(graphs) < NUM_GRAPHS and seed < MAX_ATTEMPTS:
            batch_seeds = range(seed, min(seed + BATCH, MAX_ATTEMPTS))
            results = pool.map(try_make_graph, batch_seeds)
            for i, g in enumerate(results):
                if g is not None and len(graphs) < NUM_GRAPHS:
                    g["graph_id"] = len(graphs) + 1
                    graphs.append(g)
                    hom = g["homophily_condition"]
                    cat = g["category_condition"]
                    print(
                        f"graph {g['graph_id']:02d} | seed={seed+i:5d} | "
                        f"edges={len(g['edges']):2d} | "
                        f"hom ρ(E→B)={hom['rho_EB']:+.3f} ρ(C→B)={hom['rho_CB']:+.3f} | "
                        f"cat ρ(C→B)={cat['rho_CB']:+.3f} ρ(E→B)={cat['rho_EB']:+.3f} | "
                        f"ε={g['epsilon']:.3f}"
                    )
            seed += BATCH

    total_checked = min(seed, MAX_ATTEMPTS)
    if len(graphs) < NUM_GRAPHS:
        print(f"\nWARNING: only found {len(graphs)}/{NUM_GRAPHS} valid graphs in {total_checked} attempts")
    else:
        print(f"\nfound all {NUM_GRAPHS} graphs in ~{total_checked} attempts")

    for g in graphs:
        path = os.path.join(out_dir, f"graph_{g['graph_id']:02d}.json")
        with open(path, 'w') as f:
            json.dump(g, f, indent=2)
        print(f"saved {path}")
        save_graph_image(g, out_dir)
