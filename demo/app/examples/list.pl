append([],L,L). 
append([H | T],L,[H | V]) :- append(T,L,V).

last(X,[X]). 
last(X,[_|Y]) :- last(X,Y).

nextto(X,Y,[X,Y|_]). 
nextto(X,Y,[_|Z]) :- nextto(X,Y,Z).

reverse([],[]). 
reverse([H|T],List) :- reverse(T,Z), append(Z,[H],List). 

efface(_,[],[]). 
efface(X,[X|L],L) :- !. 
efface(X,[Y|L],[Y|M]) :- efface(X,L,M). 

delete(_,[],[]). 
delete(X,[X|L],M) :- !, delete(X,L,M). 
delete(X,[Y|L1],[Y|L2]) :- delete(X,L1,L2).

subst(D1,[],D2,[]). 
subst(X,[X|L],A,[A|M]) :- !, subst(X,L,A,M). 
subst(X,[Y|L],A,[Y|M]) :- subst(X,L,A,M).

sublist([X|L],[X|M]) :- prefix(L,M). 

sublist(L,[_|M]) :- sublist(L,M). prefix([],_). 

prefix([X|L],[X|M]) :- prefix(L,M).

%% TESTING
?- sublist([of,the,club],[meeting,of,the,club,shall,be,called]).
