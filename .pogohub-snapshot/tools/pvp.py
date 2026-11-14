import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import main

src, outdir = sys.argv[1], sys.argv[2]
for slug in ['great-league','great-league-mega','ultra-league','ultra-league-mega',
             'master-league','master-league-mega','little-league']:
    recs, bad = main(os.path.join(src, slug + '.html.gz'))
    recs.sort(key=lambda r: r['ranking'])
    ranks = [r['ranking'] for r in recs]
    gaps = ranks != list(range(1, len(ranks) + 1))
    json.dump({'slug': slug, 'count': len(recs), 'entries': recs},
              open(os.path.join(outdir, slug + '.json'), 'w'), indent=1)
    print(f'{slug:<20} {len(recs):>5} entries  unparsed={bad}  rank 1..N contiguous={not gaps}')
