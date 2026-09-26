#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,m;cin>>n>>m; vector<vector<pair<int,int>>> g(n+1);
 for(int i=0;i<m;i++){int u,v,w;cin>>u>>v>>w; g[u].push_back({v,w});}
 const ll INF=2147483647LL; vector<ll> dist(n+1,INF); dist[1]=0;
 priority_queue<pair<ll,int>,vector<pair<ll,int>>,greater<pair<ll,int>>> pq; pq.push({0,1});
 while(!pq.empty()){auto [d,u]=pq.top();pq.pop(); if(d>dist[u])continue; for(auto [v,w]:g[u]){if(dist[v]>d+w){dist[v]=d+w;pq.push({dist[v],v});}}}
 for(int i=1;i<=n;i++) cout<<dist[i]<<(i==n?"\n":" "); return 0;}
