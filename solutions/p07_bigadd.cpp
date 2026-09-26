#include <bits/stdc++.h>
using namespace std;
int main(){ios::sync_with_stdio(false);cin.tie(0);
 string a,b;cin>>a>>b; reverse(a.begin(),a.end()); reverse(b.begin(),b.end());
 string r; int carry=0; size_t n=max(a.size(),b.size());
 for(size_t i=0;i<n;i++){int x= i<a.size()?a[i]-'0':0; int y= i<b.size()?b[i]-'0':0; int s=x+y+carry; r.push_back('0'+s%10); carry=s/10;}
 if(carry) r.push_back('1'); reverse(r.begin(),r.end()); cout<<r<<"\n"; return 0;}
