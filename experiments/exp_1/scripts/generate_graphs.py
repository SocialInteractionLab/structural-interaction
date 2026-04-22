#!/usr/bin/env python3
"""
generate_graphs.py — produces NUM_GRAPHS canonical graph JSONs
adapted from generate_network_graph.ipynb
"""

import numpy as np
import networkx as nx
import json, os

# ── configurable ─────────────────────────────────────────────
NUM_GRAPHS   = 5
N            = 12        # number of nodes
N_EDGES      = 15        # exact number of edges required

# no-category pilot mode: all gazorps same species (all blue), homophily only
# skips category condition entirely — set to True for species-free pilot
NO_CATEGORY  = False

# stochastic block model params
M    = 2                 # number of behavior communities
K    = 2                 # number of species groups
P_IN = 0.357             # within-community edge prob  (tuned for N_EDGES=15)
P_OUT= 0.119             # between-community edge prob (tuned for N_EDGES=15)

# minimum correlation thresholds for selecting graphs
RHO_EB_MIN   = 0.15      # homophily cond: min rho(E→B) — edge predicts behavior
RHO_CB_MIN   = 0.15      # category cond:  min rho(C→B) — species predicts behavior (ignored if NO_CATEGORY)
RHO_OTHER_MAX= 0.05      # max |rho| for the *other* cue in each condition (ignored if NO_CATEGORY)

# other selection criteria
MIN_DEGREE         = 2
SPECIES_BALANCE_MAX= 0.30   # max |mean_deg_s0 - mean_deg_s1| / mean_deg (ignored if NO_CATEGORY)
MAX_ATTEMPTS       = 50000
# ─────────────────────────────────────────────────────────────


def compute_rho_EB(A, B):
    """rho(E→B): network proximity predicts shared behavior"""
    se, sn = [], []
    for i in range(N):
        for j in range(i + 1, N):
            same = int(B[i] == B[j])
            (se if A[i, j] == 1 else sn).append(same)
    if not se or not sn:
        return 0.0
    return float(np.mean(se) - np.mean(sn))


def compute_rho_CB(C, B):
    """rho(C→B): species predicts behavior"""
    return float(np.mean([B[i] == C[i] for i in range(N)]) - 0.5)


def try_make_graph(seed):
    rng = np.random.default_rng(seed)

    # balanced latent behavior assignment
    latent_B = np.array([b for b in range(M) for _ in range(N // M)])
    rng.shuffle(latent_B)

    # stochastic block model on latent behavior
    A = np.zeros((N, N), dtype=int)
    for i in range(N):
        for j in range(i + 1, N):
            p = P_IN if latent_B[i] == latent_B[j] else P_OUT
            if rng.random() < p:
                A[i, j] = A[j, i] = 1

    G = nx.from_numpy_array(A)
    edge_count = int(A.sum() // 2)

    # basic checks
    if not nx.is_connected(G):
        return None
    if min(dict(G.degree()).values()) < MIN_DEGREE:
        return None
    if edge_count != N_EDGES:
        return None

    # homophily condition: behavior = latent, species = all-0 if NO_CATEGORY else random shuffle
    B_hom = latent_B.copy()
    group_pool = np.array([g for g in range(K) for _ in range(N // K)])

    if NO_CATEGORY:
        C_hom = np.zeros(N, dtype=int)   # all same species
    else:
        C_hom = group_pool.copy()
        rng.shuffle(C_hom)

    rho_EB_hom = compute_rho_EB(A, B_hom)
    rho_CB_hom = compute_rho_CB(C_hom, B_hom)
    if rho_EB_hom < RHO_EB_MIN:
        return None

    if not NO_CATEGORY:
        if abs(rho_CB_hom) > RHO_OTHER_MAX:   # species should NOT predict behavior
            return None
        # species balance check
        deg = np.array([int(A[i].sum()) for i in range(N)])
        mean_deg = float(deg.mean())
        deg_s0 = float(deg[C_hom == 0].mean())
        deg_s1 = float(deg[C_hom == 1].mean())
        if abs(deg_s0 - deg_s1) / mean_deg > SPECIES_BALANCE_MAX:
            return None

    # category condition — skipped in NO_CATEGORY mode
    if NO_CATEGORY:
        category_condition = None
        epsilon = None
    else:
        epsilon = float(np.clip(0.5 - rho_EB_hom, 0.0, 0.5))
        C_cat = group_pool.copy()
        rng.shuffle(C_cat)
        B_cat = np.zeros(N, dtype=int)
        for i in range(N):
            k = C_cat[i]
            B_cat[i] = k if rng.random() > epsilon else 1 - k
        rho_CB_cat = compute_rho_CB(C_cat, B_cat)
        rho_EB_cat = compute_rho_EB(A, B_cat)
        if rho_CB_cat < RHO_CB_MIN:
            return None
        if abs(rho_EB_cat) > RHO_OTHER_MAX:   # network should NOT predict behavior
            return None
        category_condition = {
            "species":  C_cat.tolist(),
            "behavior": B_cat.tolist(),
            "rho_EB":   round(rho_EB_cat, 4),
            "rho_CB":   round(rho_CB_cat, 4)
        }

    # edge recognition trials: 12 true + 12 foil, balanced across nodes
    edges = [[int(i), int(j)] for i in range(N) for j in range(i + 1, N) if A[i, j] == 1]
    non_edges = [[int(i), int(j)] for i in range(N) for j in range(i + 1, N) if A[i, j] == 0]
    rng2 = np.random.default_rng(seed + 99999)
    n_er = min(12, len(edges), len(non_edges))
    er_true_idx = rng2.choice(len(edges), n_er, replace=False)
    er_foil_idx = rng2.choice(len(non_edges), n_er, replace=False)
    er_trials = (
        [{"pair": edges[i], "true_edge": True} for i in er_true_idx] +
        [{"pair": non_edges[i], "true_edge": False} for i in er_foil_idx]
    )

    return {
        "graph_id": None,
        "seed": int(seed),
        "no_category": NO_CATEGORY,
        "N": N, "M": M, "K": K, "p_in": P_IN, "p_out": P_OUT,
        "adjacency": A.tolist(),
        "edges": edges,
        "homophily_condition": {
            "species":  C_hom.tolist(),
            "behavior": B_hom.tolist(),
            "rho_EB":   round(rho_EB_hom, 4),
            "rho_CB":   round(rho_CB_hom, 4)
        },
        "category_condition": category_condition,
        "epsilon": round(epsilon, 4) if epsilon is not None else None,
        "edge_recognition_trials": er_trials
    }


out_dir = os.path.join(os.path.dirname(__file__), '..', 'stimuli',
                       'graphs_no_category' if NO_CATEGORY else 'graphs')
os.makedirs(out_dir, exist_ok=True)

graphs = []
seed = 0
while len(graphs) < NUM_GRAPHS and seed < MAX_ATTEMPTS:
    g = try_make_graph(seed)
    if g is not None:
        g["graph_id"] = len(graphs) + 1
        graphs.append(g)
        hom = g["homophily_condition"]
        cat = g["category_condition"]
        if NO_CATEGORY:
            print(
                f"graph {g['graph_id']:02d} | seed={seed:5d} | "
                f"edges={len(g['edges']):2d} | "
                f"hom ρEB={hom['rho_EB']:+.3f} ρCB={hom['rho_CB']:+.3f} | "
                f"[no-category mode]"
            )
        else:
            print(
                f"graph {g['graph_id']:02d} | seed={seed:5d} | "
                f"edges={len(g['edges']):2d} | "
                f"hom ρEB={hom['rho_EB']:+.3f} ρCB={hom['rho_CB']:+.3f} | "
                f"cat ρEB={cat['rho_EB']:+.3f} ρCB={cat['rho_CB']:+.3f} | "
                f"ε={g['epsilon']:.3f}"
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
