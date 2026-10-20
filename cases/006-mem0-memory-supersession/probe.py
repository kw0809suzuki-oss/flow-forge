"""Flow Forge 006. Run with: python -m pip install mem0ai; python probe.py
Tests native mem0.utils.scoring.score_and_rank on injected synthetic retrieval scores.
This is NOT an end-to-end vector/embedding/LLM evaluation.
"""
from datetime import datetime
from mem0.utils.scoring import score_and_rank

def memory(key, score, when, subject, content, supersedes=None):
    return {
        "id": key, "score": score, "payload": {
            "created_at": when, "fact_key": subject,
            "text": content, "supersedes": supersedes,
        },
    }

def ids(records):
    return [m["id"] for m in records]

def recent_first(records):
    return sorted(records, key=lambda m: m["payload"]["created_at"], reverse=True)

def global_recency_bonus(records, weight=0.1):
    seconds = [datetime.fromisoformat(m["payload"]["created_at"]).timestamp() for m in records]
    low, high = min(seconds), max(seconds)
    def priority(record):
        when = datetime.fromisoformat(record["payload"]["created_at"]).timestamp()
        return record["score"] + weight * ((when - low) / (high - low) if high > low else 0)
    return sorted(records, key=priority, reverse=True)

def explicit_lineage(records, mode="current"):
    """Post-retrieval prototype. Does not infer supersession from recency alone."""
    if mode == "historical":
        return {"visible": records, "superseded": [], "unresolved": []}
    by_id = {m["id"]: m for m in records}
    superseded = set()
    unresolved = []
    for memory in records:
        prior = memory["payload"].get("supersedes")
        if prior is None:
            continue
        old = by_id.get(prior)
        if old and old["payload"]["fact_key"] == memory["payload"]["fact_key"]:
            superseded.add(prior)
        else:
            unresolved.append(memory["id"])
    return {
        "visible": [m for m in records if m["id"] not in superseded],
        "superseded": [m for m in records if m["id"] in superseded],
        "unresolved": unresolved,
    }

cases = [
    ("explicit_update", [
        memory("old", .92, "2023-01-01T00:00:00", "location", "Lives in Chicago"),
        memory("new", .75, "2023-08-01T00:00:00", "location", "Moved to suburbs", "old"),
    ]),
    ("recent_unrelated", [
        memory("relevant", .82, "2023-01-01T00:00:00", "project", "Current project is Astra"),
        memory("unrelated", .77, "2026-08-01T00:00:00", "color", "Favorite color is green"),
    ]),
    ("unlinked_conflict", [
        memory("a", .89, "2023-01-01T00:00:00", "team_size", "Five members"),
        memory("b", .78, "2024-01-01T00:00:00", "team_size", "Six members"),
    ]),
    ("newer_guess", [
        memory("confirmed", .89, "2023-01-01T00:00:00", "deadline", "Verified Nov 10"),
        memory("guess", .86, "2024-01-01T00:00:00", "deadline", "Someone guessed Nov 12"),
    ]),
]
rows = []
for name, items in cases:
    ranked = score_and_rank(items, {}, {}, threshold=.1, top_k=10)
    relation = explicit_lineage(ranked)
    row = {
        "name": name, "native": ids(ranked),
        "date_sort": ids(recent_first(ranked)),
        "recency_bonus_0_1": ids(global_recency_bonus(ranked)),
        "explicit_lineage_visible": ids(relation["visible"]),
        "superseded": ids(relation["superseded"]),
    }
    print(row)
    rows.append(row)

assert rows[0]["native"] == ["old", "new"]
assert rows[0]["recency_bonus_0_1"] == ["old", "new"]
assert rows[0]["explicit_lineage_visible"] == ["new"]
assert rows[1]["recency_bonus_0_1"] == ["unrelated", "relevant"]
assert rows[1]["explicit_lineage_visible"] == ["relevant", "unrelated"]
assert rows[2]["explicit_lineage_visible"] == ["a", "b"]
assert rows[3]["explicit_lineage_visible"] == ["confirmed", "guess"]
print("4/4 scenario assertions passed")
