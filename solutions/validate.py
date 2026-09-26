#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CSP-S 第二轮题库参考解法验证脚本。
对每道题: 用独立 Python 逻辑生成输入与期望输出, 编译 C++ 参考解法, 运行对比。
"""
import subprocess, os, random, sys, heapq, bisect
from collections import deque

SOL_DIR = os.path.dirname(os.path.abspath(__file__))
random.seed(2026)

def run_cpp(src, inp):
    exe = src + ".exe"
    subprocess.run(["g++", "-O2", "-std=c++17", "-o", exe, src], check=True)
    r = subprocess.run([exe], input=inp.encode(), capture_output=True, timeout=30)
    return r.stdout.decode()

def norm(s):
    return "\n".join(line.rstrip() for line in s.strip().splitlines()).strip()

# ---------- independent expected-output functions ----------
def exp_p01(inp):
    lines = inp.strip().splitlines(); n=int(lines[0]); a=[int(x) for x in lines[1].split()]
    from collections import Counter
    c=Counter(a); out=""
    for k in sorted(c): out+=f"{k} {c[k]}\n"
    return out

def exp_p02(inp):
    L=inp.strip().splitlines(); n,m=map(int,L[0].split()); a=[0]+[int(x) for x in L[1].split()]
    pre=[0]*(n+1)
    for i in range(1,n+1): pre[i]=pre[i-1]+a[i]
    out=""
    for i in range(m):
        l,r=map(int,L[2+i].split()); out+=f"{pre[r]-pre[l-1]}\n"
    return out

def exp_p03(inp):
    L=inp.strip().splitlines(); n,k=map(int,L[0].split()); lens=list(map(int,L[1].split()))
    lo,hi=0,max(lens); ans=0
    while lo<=hi:
        mid=(lo+hi)//2
        if mid==0: break
        if sum(x//mid for x in lens)>=k: ans=mid; lo=mid+1
        else: hi=mid-1
    return f"{ans}\n"

def exp_p04(inp):
    L=inp.strip().splitlines(); n=int(L[0]); iv=[tuple(map(int,L[i+1].split())) for i in range(n)]
    iv.sort(key=lambda x:x[1]); last=-10**9; cnt=0
    for s,e in iv:
        if s>=last: cnt+=1; last=e
    return f"{cnt}\n"

def exp_p05(inp):
    L=inp.strip().splitlines(); n=int(L[0]); h=list(map(int,L[1].split()))
    ans=0
    for i in range(n):
        mn=h[i]
        for j in range(i,n):
            mn=min(mn,h[j]); ans=max(ans,mn*(j-i+1))
    return f"{ans}\n"

def exp_p06(inp):
    L=inp.strip().splitlines(); n,m=map(int,L[0].split())
    edges=[tuple(map(int,L[i+1].split())) for i in range(m)]
    edges.sort(key=lambda x:x[2])
    fa=list(range(n+1))
    def find(x):
        while fa[x]!=x: fa[x]=fa[fa[x]]; x=fa[x]
        return x
    s=0; cnt=0
    for u,v,w in edges:
        a,b=find(u),find(v)
        if a!=b: fa[a]=b; s+=w; cnt+=1
    if cnt<n-1: return "orz\n"
    return f"{s}\n"

def exp_p07(inp):
    a,b=inp.strip().splitlines(); return f"{int(a)+int(b)}\n"

def exp_p08(inp):
    L=inp.strip().splitlines(); n=int(L[0]); a=list(map(int,L[1].split()))
    d=[]
    for x in a:
        i=bisect.bisect_left(d,x)
        if i==len(d): d.append(x)
        else: d[i]=x
    return f"{len(d)}\n"

def exp_p09(inp):
    L=inp.strip().splitlines(); n,C=map(int,L[0].split())
    items=[tuple(map(int,L[i+1].split())) for i in range(n)]
    dp=[0]*(C+1)
    for w,v in items:
        for c in range(C,w-1,-1):
            dp[c]=max(dp[c],dp[c-w]+v)
    return f"{dp[C]}\n"

def exp_p10(inp):
    L=inp.strip().splitlines(); n,m=map(int,L[0].split())
    g=[[] for _ in range(n+1)]
    for i in range(m):
        u,v,w=map(int,L[i+1].split()); g[u].append((v,w))
    INF=2147483647; dist=[INF]*(n+1); dist[1]=0
    pq=[(0,1)]
    while pq:
        d,u=heapq.heappop(pq)
        if d>dist[u]: continue
        for v,w in g[u]:
            if dist[v]>d+w: dist[v]=d+w; heapq.heappush(pq,(dist[v],v))
    return " ".join(str(dist[i]) for i in range(1,n+1))+"\n"

def exp_p11(inp):
    L=inp.strip().splitlines(); n=int(L[0])
    g=[[] for _ in range(n+1)]
    for i in range(n-1):
        u,v=map(int,L[i+1].split()); g[u].append(v); g[v].append(u)
    def bfs(s):
        dist=[-1]*(n+1); dist[s]=0; q=deque([s]); far=s
        while q:
            u=q.popleft()
            for v in g[u]:
                if dist[v]<0: dist[v]=dist[u]+1; q.append(v)
                if dist[v]>dist[far]: far=v
        return far,dist[far]
    f,_=bfs(1); _,d=bfs(f)
    return f"{d}\n"

def exp_p12(inp):
    L=inp.strip().splitlines(); n,m=map(int,L[0].split())
    g=[[] for _ in range(n+1)]; indeg=[0]*(n+1)
    for i in range(m):
        u,v,w=map(int,L[i+1].split()); g[u].append((v,w)); indeg[v]+=1
    NEG=-10**18; dp=[NEG]*(n+1); dp[1]=0
    q=deque([i for i in range(1,n+1) if indeg[i]==0])
    while q:
        u=q.popleft()
        for v,w in g[u]:
            if dp[u]!=NEG: dp[v]=max(dp[v],dp[u]+w)
            indeg[v]-=1
            if indeg[v]==0: q.append(v)
    return f"{-1 if dp[n]==NEG else dp[n]}\n"

def exp_p13(inp):
    n=int(inp.strip()); MOD=1000000007
    if n<=2: return "1\n"
    def mm(A,B):
        return [[sum(A[i][k]*B[k][j] for k in range(2))%MOD for j in range(2)] for i in range(2)]
    base=[[1,1],[1,0]]; res=[[1,0],[0,1]]; e=n-2
    while e:
        if e&1: res=mm(res,base)
        base=mm(base,base); e>>=1
    return f"{(res[0][0]+res[0][1])%MOD}\n"

def exp_p14(inp):
    s,t=inp.strip().splitlines(); cnt=0
    for i in range(len(s)-len(t)+1):
        if s[i:i+len(t)]==t: cnt+=1
    return f"{cnt}\n"

def exp_p15(inp):
    L=inp.strip().splitlines(); n,m=map(int,L[0].split())
    g=[list(L[i+1]) for i in range(n)]
    dq=deque([(0,0)]); dist={(0,0):0}
    while dq:
        x,y=dq.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<n and 0<=ny<m and g[nx][ny]=='0' and (nx,ny) not in dist:
                dist[(nx,ny)]=dist[(x,y)]+1; dq.append((nx,ny))
    return f"{dist.get((n-1,m-1),-1)}\n"

def exp_p16(inp):
    L=inp.strip().splitlines(); n,q=map(int,L[0].split()); a=[0]+[int(x) for x in L[1].split()]
    out=""
    for i in range(q):
        p=list(map(int,L[2+i].split()))
        if p[0]==1: a[p[1]]=p[2]
        else: out+=f"{sum(a[p[1]:p[2]+1])}\n"
    return out

EXP = {1:exp_p01,2:exp_p02,3:exp_p03,4:exp_p04,5:exp_p05,6:exp_p06,7:exp_p07,
       8:exp_p08,9:exp_p09,10:exp_p10,11:exp_p11,12:exp_p12,13:exp_p13,14:exp_p14,15:exp_p15,16:exp_p16}
SRC = {1:"p01_count.cpp",2:"p02_prefixsum.cpp",3:"p03_rope.cpp",4:"p04_intervals.cpp",5:"p05_histogram.cpp",
       6:"p06_mst.cpp",7:"p07_bigadd.cpp",8:"p08_lis.cpp",9:"p09_knapsack.cpp",10:"p10_dijkstra.cpp",
       11:"p11_diameter.cpp",12:"p12_dag.cpp",13:"p13_fib.cpp",14:"p14_kmp.cpp",15:"p15_maze.cpp",16:"p16_bit.cpp"}

# ---------- test inputs ----------
TESTS = {
1: ["5\n1 2 1 3 2\n","1\n1000000000\n","8\n9 9 9 9 9 9 9 9\n","6\n5 4 3 2 1 5\n","7\n100 7 100 7 100 7 2\n"],
2: ["5 3\n1 2 3 4 5\n1 5\n2 3\n3 3\n","4 2\n10 20 30 40\n2 4\n1 1\n","3 1\n1000000000 1000000000 1000000000\n1 3\n"],
3: ["3 5\n6 7 9\n","2 4\n10 10\n","1 1\n7\n","4 10\n1 2 3 4\n","5 3\n1000000000 1 1 1 1\n"],
4: ["4\n1 3\n2 5\n3 6\n5 7\n","3\n1 2\n2 3\n3 4\n","5\n1 100\n2 99\n3 98\n100 101\n50 50\n"],
5: ["6\n2 1 5 6 2 3\n","4\n1 1 1 1\n","1\n5\n","7\n6 2 5 4 5 1 6\n","5\n2 4 4 4 2\n"],
6: ["4 5\n1 2 1\n1 3 3\n2 3 1\n2 4 6\n3 4 5\n","3 1\n1 2 5\n","3 3\n1 2 2\n2 3 2\n1 3 2\n","5 4\n1 2 10\n2 3 10\n3 4 10\n4 5 10\n"],
7: ["123\n456\n","999\n1\n","999999999999999999999999999999\n1\n","0\n0\n","123456789012345678901234567890\n987654321098765432109876543210\n"],
8: ["6\n1 3 2 4 3 5\n","5\n5 4 3 2 1\n","4\n1 2 3 4\n","8\n10 9 2 5 3 7 101 18\n"],
9: ["3 10\n5 6\n4 4\n6 8\n","2 5\n3 10\n3 10\n","4 7\n2 3\n3 4\n4 5\n5 6\n","1 100\n50 9999\n"],
10:["4 4\n1 2 2\n1 3 1\n2 4 5\n3 4 1\n","3 1\n1 2 3\n","3 2\n1 2 4\n2 3 5\n","5 4\n1 2 1\n2 3 1\n3 4 1\n4 5 1\n"],
11:["4\n1 2\n2 3\n3 4\n","5\n1 2\n1 3\n1 4\n1 5\n","5\n1 2\n2 3\n2 4\n4 5\n","3\n1 2\n2 3\n"],
12:["3 3\n1 2 5\n2 3 3\n1 3 4\n","5 5\n1 2 1\n1 3 2\n2 4 3\n3 4 1\n4 5 2\n","3 1\n2 3 1\n","4 4\n1 2 2\n2 4 3\n1 3 5\n3 4 1\n"],
13:["10\n","1\n","2\n","100\n","1000000000000000000\n"],
14:["aaaa\naa\n","abc\nd\n","ababab\naba\n","a\na\n","abcabcabc\nabc\n"],
15:["2 2\n00\n00\n","3 3\n000\n010\n000\n","3 3\n010\n010\n010\n","1 1\n0\n","4 4\n0000\n0110\n0000\n0110\n"],
16:["5 3\n1 2 3 4 5\n2 1 5\n1 3 10\n2 1 5\n","3 2\n5 5 5\n2 2 3\n1 1 0\n2 1 3\n","4 2\n1 2 3 4\n2 1 4\n1 2 5\n2 1 4\n"],
}

# random big tests
def rnd_big():
    TESTS[2].append("100000 3\n"+" ".join(str(random.randint(1,10**9)) for _ in range(100000))+"\n"+"\n".join(f"{random.randint(1,100000)} {random.randint(1,100000)}" for _ in range(3))+"\n")
def rnd_p8():
    TESTS[8].append("200000\n"+" ".join(str(random.randint(-10**9,10**9)) for _ in range(200000))+"\n")

def main():
    rnd_big(); rnd_p8()
    ok=True
    for pid in sorted(SRC):
        src=os.path.join(SOL_DIR,SRC[pid])
        try:
            run_cpp(src,"1 1\n0\n")
        except Exception as e:
            print(f"P{pid:02d} COMPILE FAIL: {e}"); ok=False; continue
        for ti,inp in enumerate(TESTS[pid]):
            got=run_cpp(src,inp)
            want=EXP[pid](inp)
            if norm(got)!=norm(want):
                ok=False; print(f"P{pid:02d} test{ti} MISMATCH\n  input={inp!r}\n  got={got!r}\n  want={want!r}")
        print(f"P{pid:02d} OK ({len(TESTS[pid])} tests)")
    print("ALL OK" if ok else "FAILURES PRESENT")
    return 0 if ok else 1

if __name__=="__main__":
    sys.exit(main())
