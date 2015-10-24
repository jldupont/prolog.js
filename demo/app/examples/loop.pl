"""
This example demonstrates how circularity is handled
"""

f(X) :- g(X).
g(X) :- f(X).

?- f(Y).
