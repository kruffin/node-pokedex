
var csv = require('csv'),
	Pokedex = require('./pokedex'),
	q = require('q'),
	fs = require('fs'),
	path = require('path');

module.exports = exports = (function () {

	/**
	* @param lowdbLoc Takes in a lowdb path and file name if the data should be backed on disk.
	* 				  If the file already exists, csv parsing will not take place and the file
	*				  will be used as-is. If this parameter is null or undefined then an in-memory
	*				  db will be used.
	* @param csvBaseLoc The base path location to the csv files used to generate a lowdb database.
	*/
	function _getPdex (lowdbLoc, csvBaseLoc) {
		var pdex = new Pokedex(lowdbLoc);

		return q(pdex)
			// Read pokemon
			.then(_readPokemon.bind(this, csvBaseLoc))
			// Read stats names
			.then(_readStats.bind(this, csvBaseLoc))
			// Read pokemon stats
			.then(_readPokemonStats.bind(this, csvBaseLoc))
			// Read moves
			.then(_readMoves.bind(this, csvBaseLoc))
			// Read pokemon moves
			.then(_readPokemonMoves.bind(this, csvBaseLoc))
			// Return the pokedex
			.then(function () {
				return pdex;
			});
	}

	// Q chain that returns a pokedex at the end.
	return _getPdex;

	// Hoisted helper functions
	function _csvHelper (filename, recordFunc, finishFunc) {
		var pd = q.defer();

		fs.createReadStream(filename)
			.pipe(csv.parse({columns: true, auto_parse: true}))
			.pipe(csv.transform( recordFunc ))
			.on('end', function () {
				finishFunc(pd);
			})
			.on('error', function (err) {
				pd.reject(err);
			}).resume();

		return pd.promise;
	}

	function _readPokemon (csvBaseLoc, pdex) {
		return _csvHelper(path.join(csvBaseLoc, 'pokemon.csv'), function (record) {
			record.name = record.identifier;
			delete record.identifier;
			
			pdex.addPokemon(record);
			return record;
		}, function (promise) {
			promise.resolve(pdex);
		});
	};

	function _readStats (csvBaseLoc, pdex) { 
		var stats = {};
		return _csvHelper(path.join(csvBaseLoc, 'stats.csv'), function (record) {
			record.name = record.identifier;
			delete record.identifier;
			
			stats[record.id] = record;
			return record;
		}, function (promise) {
			promise.resolve({pdex: pdex, stats: stats});
		});
	};

	function _readPokemonStats (csvBaseLoc, obj) { 
		var pchain = [];
		return _csvHelper(path.join(csvBaseLoc, 'pokemon_stats.csv'), function (record) {
			// Get the pokemon the stat is for
			pchain.push(function () {
				return obj.pdex.getPokemonById(record.pokemon_id)
				.then(function (pkmn) {
					var s = obj.stats[record.stat_id];
					var pstats = pkmn.stats || {};
					pstats[s.name] = {base: record.base_stat, effort: record.effort};
					// Update the pokemon
					return obj.pdex.addPokemon({id: pkmn.id, stats: pstats});
				})
			});
		}, function (promise) {
			// Add in the final resolve call
			pchain.push(function () {
				promise.resolve(obj.pdex);
			});
			// Create the sequential chain and evaluate
			pchain.reduce(q.when, q()).done();
		});

		return obj.pdex;

	};
	function _readMoves (csvBaseLoc, pdex) {
		var moves = {},
			pchain = [];
		return _csvHelper(path.join(csvBaseLoc, 'moves.csv'), function (record) {
			record.name = record.identifier;
			delete record.identifier;
			
			moves[record.id] = record;
			pchain.push(function () {
				return pdex.addMove(record);
			});
			return record;
		}, function (promise) {
			// Add in the final resolve call
			pchain.push(function () {
				promise.resolve({pdex: pdex, moves: moves});
			});
			// Create the sequential chain and evaluate
			pchain.reduce(q.when, q()).done();
		});

	};
	function _readPokemonMoves (csvBaseLoc, obj) { return obj.pdex; };
		
})();