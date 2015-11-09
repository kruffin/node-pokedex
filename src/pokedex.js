
var low = require('lowdb'),
	q = require('q');

module.exports = exports = (function () {

	function Pokedex (lowdbLoc) {
		this._pokedex = low(lowdbLoc, {autosave: false});
		this._db = {
			pokemon: this._pokedex('pokemon'),
			pokeMoves: this._pokedex('poke-moves'),
			versionGroups: this._pokedex('version-groups')
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
		getMoveByName: function (name) {
			var self = this;
			return q().then( function () {
				return self._db.pokeMoves.find({ name: name });
			});
		},
		getMoveById: function (id) {
			var self = this;
			return q().then( function () {
				return self._db.pokeMoves.find({ id: id });
			});
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

		// Versions
		addVersionGroup: function (vgroup) {
			var self = this;
			return q().then( function () { self._db.versionGroups.push(vgroup); });
		},
		getVersionGroupById: function (id) {
			var self = this;
			return q().then( function () {
				return self._db.versionGroups.find({ id: id });
			});
		},
		getLatestVersionGroup: function () {
			var self = this;
			return q().then( function () {
				return self._db.versionGroups
					.chain()
					.sortByOrder('order', 'desc')
					.take(1)
					.value()[0];
			});
		},
		save: function () {
			var self = this;
			return q().then( function () {
				return self._pokedex.save();
			});
		}
	};

	return Pokedex;

})();
