import gzip, json, re, sys, os

def unesc(s):
    return s.replace('\\"', '"')

def objects(text, anchor='{"pokemon":{'):
    out = []
    i = 0
    while True:
        i = text.find(anchor, i)
        if i < 0:
            break
        depth = 0
        j = i
        instr = False
        esc = False
        while j < len(text):
            c = text[j]
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif instr:
                if c == '"':
                    instr = False
            elif c == '"':
                instr = True
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    out.append(text[i:j+1])
                    break
            j += 1
        i = j + 1
    return out

def main(path):
    raw = gzip.open(path, 'rt', encoding='utf-8', errors='replace').read()
    text = unesc(raw)
    recs = []
    bad = 0
    for blob in objects(text):
        try:
            recs.append(json.loads(blob))
        except Exception:
            bad += 1
    return recs, bad

if __name__ == '__main__':
    recs, bad = main(sys.argv[1])
    print(os.path.basename(sys.argv[1]), 'records=', len(recs), 'unparsed=', bad)
    if recs:
        print('keys:', sorted(recs[0].keys()))
        print('sample:', json.dumps(recs[0])[:300])
