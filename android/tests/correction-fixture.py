"""Owned emulator fixture timestamps and exact SQLite snapshots, never production data."""
from pathlib import Path
import json, sqlite3, sys
base=Path(__file__).resolve().parents[3]
mode=sys.argv[1];db_path=Path(sys.argv[2]).resolve()
assert db_path.parent==base/'LibraryPatch' and db_path.suffix=='.db'
with sqlite3.connect(db_path) as db:
    if mode=='retime':
        f=json.loads((base/'LibraryPatch/clock-fixture.json').read_text())
        first_done=f['emulatorNow']-86400000-90000
        # Only timestamps change; actual native answers, scores, cursor and ledger are retained.
        db.execute('UPDATE program_runs SET started_at=?,completed_at=? WHERE id=?',(first_done-60000,first_done,f['first']))
        db.execute('UPDATE program_runs SET started_at=? WHERE id=?',(first_done-120000,f['early']))
        db.execute('UPDATE program_attempts SET created_at=?+exercise_order*1000 WHERE run_id=?',(first_done-119000,f['early']))
        db.execute('UPDATE program_attempts SET created_at=?+exercise_order*1000 WHERE run_id=?',(first_done-59000,f['first']))
        db.commit();print('Adjusted only controlled old-fixture run/attempt timestamps; no answer or score assigned.')
    elif mode=='snapshot':
        tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        snapshot={'version':db.execute('PRAGMA user_version').fetchone()[0],'tables':{}}
        for name in tables:
            assert name.replace('_','').isalnum()
            cur=db.execute('SELECT * FROM "'+name+'" ORDER BY rowid')
            snapshot['tables'][name]={'columns':[d[0] for d in cur.description],'rows':cur.fetchall()}
        print(json.dumps(snapshot,ensure_ascii=True))
    else:raise ValueError('Unknown fixture action')
