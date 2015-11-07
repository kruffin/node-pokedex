
var low = require('lowdb'),
	q = require('q');

module.exports = exports = (function () {

	function Pokedex () {
		this._pokedex = low(); // in memory for now
		this._db = {
			pokemon: this._pokedex('pokemon'),
			pokeMoves: this._pokedex('poke-moves')
		}
	}

	Pokedex.prototype = {
		addPokemon: function (pmon) {
			var self = this;
			return q().then( function () { 
				// see if the pokemon exists already
				var p = self._db.pokemon.find({ id: pmon.id });
				if (p) {
					// it's already here so update it
					self._db.pokemon.chain()
						.find({ id: pmon.id })
						.assign(pmon)
						.value();
				} else {
					// not here so just update it
					self._db.pokemon.push(pmon); 
				}
			} );
		},
		addMove: function (move) {
			var self = this;
			return q().then( function () { self._db.pokeMoves.push(move); });
		},
		getPokemonByName: function (name) {
			var self = this;
			return q().then( function () {
				return self._db.pokemon.find({ name: name });
			});
		},
		getPokemonById: function (id) {
			var self = this;
			return q().then( function () {
				return self._db.pokemon.find({ id: id });
			});
		},
		getPokeMoveByName: function (name) {
			var self = this;
			return q().then( function () {
				return self._db.pokeMoves.find({ name: name });
			});
		}
	};

	return Pokedex;

})();
