#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n; cin>>n; map<long long,int> cnt; long long x;
 for(int i=0;i<n;i++){cin>>x; cnt[x]++;}
 for(auto &p:cnt) cout<<p.first<<" "<<p.second<<"\n";
 return 0;}
