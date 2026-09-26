#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n;cin>>n; vector<vector<int>> g(n+1);
 for(int i=0;i<n-1;i++){int u,v;cin>>u>>v;g[u].push_back(v);g[v].push_back(u);}
 auto bfs=[&](int s)->pair<int,int>{vector<int> dist(n+1,-1);queue<int>q;dist[s]=0;q.push(s);int far=s;while(!q.empty()){int u=q.front();q.pop();for(int v:g[u])if(dist[v]<0){dist[v]=dist[u]+1;q.push(v);if(dist[v]>dist[far])far=v;}}return {far,dist[far]};};
 auto p1=bfs(1); auto p2=bfs(p1.first); cout<<p2.second<<"\n"; return 0;}
