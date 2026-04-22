#!/usr/bin/env python3
"""
generate_graphs.py — produces NUM_GRAPHS canonical graph JSONs
adapted from generate_network_graph.ipynb
"""

import numpy as np
import networkx as nx
import json, os

# ── configurable ─────────────────────────────────────────────
NUM_GRAPHS = 5

# fixed params
N = 12; M = 2; K = 2; p_in = 0.6; p_out = 0.2

# selection criteria
RHO_EB_MIN = 0.25     # homophily cond: min rho(E→B)
RHO_CB_MIN = 0.25     # category cond: min rho(C→B)
EDGE_RANGE = [20, 30]
MIN_DEGREE = 2
SPECIES_BALANCE_MAX = 0.30   # |deg_s0 - deg_s1| / mean_deg
MAX_ATTEMPTS = 50000
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
            p = p_in if latent_B[i] == latent_B[j] else p_out
            if rng.random() < p:
                A[i, j] = A[j, i] = 1

    G = nx.from_numpy_array(A)
    edge_count = int(A.sum() // 2)

    # basic checks
    if not nx.is_connected(G):
        return None
    if min(dict(G.degree()).values()) < MIN_DEGREE:
        return None
    if not (EDGE_RANGE[0] <= edge_count <= EDGE_RANGE[1]):
        return None

    # homophily condition: behavior = latent, species = random shuffle
    B_hom = latent_B.copy()
    group_pool = np.array([g for g in range(K) for _ in range(N // K)])
    C_hom = group_pool.copy()
    rng.shuffle(C_hom)

    rho_EB_hom = compute_rho_EB(A, B_hom)
    rho_CB_hom = compute_rho_CB(C_hom, B_hom)
    if rho_EB_hom < RHO_EB_MIN:
        return None

    # species balance: check degrees don't differ too much by species
    deg = np.array([int(A[i].sum()) for i in range(N)])
    mean_deg = float(deg.mean())
    deg_s0 = float(deg[C_hom == 0].mean())
    deg_s1 = float(deg[C_hom == 1].mean())
    if abs(deg_s0 - deg_s1) / mean_deg > SPECIES_BALANCE_MAX:
        return None

    # derive epsilon for matched rho(C→B) in category condition
    epsilon = float(np.clip(0.5 - rho_EB_hom, 0.0, 0.5))

    # category condition: species = fresh shuffle, behavior derived from species
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
        "N": N, "M": M, "K": K, "p_in": p_in, "p_out": p_out,
        "adjacency": A.tolist(),
        "edges": edges,
        "homophily_condition": {
            "species":  C_hom.tolist(),
            "behavior": B_hom.tolist(),
            "rho_EB":   round(rho_EB_hom, 4),
            "rho_CB":   round(rho_CB_hom, 4)
        },
        "category_condition": {
            "species":  C_cat.tolist(),
            "behavior": B_cat.tolist(),
            "rho_EB":   round(rho_EB_cat, 4),
            "rho_CB":   round(rho_CB_cat, 4)
        },
        "epsilon": round(epsilon, 4),
        "edge_recognition_trials": er_trials
    }


out_dir = os.path.join(os.path.dirname(__file__), '..', 'stimuli', 'graphs')
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
