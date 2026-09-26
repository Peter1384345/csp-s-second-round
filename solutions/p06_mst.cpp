#include <bits/stdc++.h>
using namespace std;
struct E{int u,v;long long w;};
int fa[100005]; int find(int x){return fa[x]==x?x:fa[x]=find(fa[x]);}
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n,m;cin>>n>>m; vector<E> e(m);
 for(int i=0;i<m;i++) cin>>e[i].u>>e[i].v>>e[i].w;
 sort(e.begin(),e.end(),[](auto&a,auto&b){return a.w<b.w;});
 for(int i=1;i<=n;i++) fa[i]=i;
 long long sum=0; int cnt=0;
 for(auto &ed:e){int a=find(ed.u),b=find(ed.v); if(a!=b){fa[a]=b;sum+=ed.w;cnt++;}}
 if(cnt<n-1) cout<<"orz\n"; else cout<<sum<<"\n"; return 0;}
