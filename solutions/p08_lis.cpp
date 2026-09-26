#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 int n;cin>>n; vector<int> a(n); for(int i=0;i<n;i++)cin>>a[i];
 vector<int> d;
 for(int x:a){auto it=lower_bound(d.begin(),d.end(),x); if(it==d.end()) d.push_back(x); else *it=x;}
 cout<<d.size()<<"\n"; return 0;}
