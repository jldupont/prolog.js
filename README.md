# prolog.js
Prolog parser, compiler and interpreter in Javascript

### Status
[![Build Status](https://travis-ci.org/jldupont/prolog.js.svg?branch=master)](https://travis-ci.org/jldupont/prolog.js)

# Features

* No server-code required
* Fact
* Rule
* Cut operator `!`
* Conjunction `,` and disjunction `;`
* `true` and `false` boolean
* Operators  (for more details, please see `lexer.js`
  * `is`
  * `+`, `-`, `*` and `/` arithmetic operators
  * `=` unification
  * `=:=`, `=\=`, `>`, `<`, `=<` and `>=` arithmetic operators
  * `+`, `-` and `not` unary operators
* `builtin` and `user` namespaces
  * But no builtin facts or rules are provided out-of-the-box
* List with `|` tail operator
* `?-` unary operator
* `fail`
 
# `?-` operator

The query operator is not standard in prolog source code. It is provided as convenience and used in the online demo.

# DEMO

The demo can be accessed through [here](http://prolog.jldupont.com/).

# Javascript bridge

The compiler can be fed directly with Javascript objects. The classes `Functor` and `Token` can be used for this purpose. 
To understand how to construct "sentences" using these objects, I would encourage looking at the `/tests` and experimenting with
`Prolog.parse_per_sentence`.

# Contact

For more information, please contact [Jean-Lou Dupont on G+](https://plus.google.com/u/0/+JeanLouDupont/posts).