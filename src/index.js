
var csv = require('csv'),
    Pokedex = require('./pokedex'),
    q = require('q'),
    fs = require('fs'),
    path = require('path');

module.exports = exports = (function () {
	var DEFAULT_DB=path.join(require.resolve('node-pokedex'), "../../data/pokedex.json");

	function _fileExists (filename) {
		try {
			if (fs.statSync(filename)) {
				return true;
			}
		} catch (err) {
			// No dice.
		}

		return false;
	}
    /**
    * @param lowdbLoc Takes in a lowdb path and file name if the data should be backed on disk.
    *                 If the file already exists, csv parsing will not take place and the file
    *                 will be used as-is. If this parameter is null or undefined then an in-memory
    *                 db will be used.
    * @param csvBaseLoc The base path location to the csv files used to generate a lowdb database.
    */
    function _getPdex (lowdbLoc, csvBaseLoc) {
    	var pdex;
    	if (lowdbLoc && _fileExists(lowdbLoc)) {
    		// If the low db file exists, use it and don't generate a new one.
    		pdex = new Pokedex(lowdbLoc);
    		return q().then(function () {
    			return pdex;
    		});
    	} else if (!lowdbLoc && _fileExists(DEFAULT_DB)) {
    		pdex = new Pokedex(DEFAULT_DB);
    		return q().then(function () {
    			return pdex;
    		});
    	}

    	// Generate a new low db from the csvs
        pdex = new Pokedex(lowdbLoc);

        return q(pdex)
            // Read version groups
            .then(_readVersionGroups.bind(this, csvBaseLoc))
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
            // Save the db
            .then(pdex.save.bind(pdex))
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

    function _readVersionGroups (csvBaseLoc, pdex) {
        return _csvHelper(path.join(csvBaseLoc, 'version_groups.csv'), function (record) {
            record.name = record.identifier;
            delete record.identifier;
            
            pdex.addVersionGroup(record);
            return record;
        }, (function (promise) {
	        	pdex.getLatestVersionGroup().then(function (vg) {
	        		promise.resolve({versionGroup: vg, pdex: pdex});
	        	})
        	})
        );
    };

    function _readPokemon (csvBaseLoc, obj) {
        return _csvHelper(path.join(csvBaseLoc, 'pokemon.csv'), function (record) {
            record.name = record.identifier;
            delete record.identifier;
            
            obj.pdex.addPokemon(record).done();
            return record;
        }, function (promise) {
            promise.resolve(obj);
        });
    };

    function _readStats (csvBaseLoc, obj) { 
        var stats = {};
        return _csvHelper(path.join(csvBaseLoc, 'stats.csv'), function (record) {
            record.name = record.identifier;
            delete record.identifier;
            
            stats[record.id] = record;
            return record;
        }, function (promise) {
        	obj.stats = stats;
            promise.resolve(obj);
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
                promise.resolve(obj);
            });
            // Create the sequential chain and evaluate
            pchain.reduce(q.when, q()).done();
        });
    };
    function _readMoves (csvBaseLoc, obj) {
        var pchain = [];
        return _csvHelper(path.join(csvBaseLoc, 'moves.csv'), function (record) {
            record.name = record.identifier;
            delete record.identifier;

            pchain.push(function () {
                return obj.pdex.addMove(record);
            });
            return record;
        }, function (promise) {
            // Add in the final resolve call
            pchain.push(function () {
                promise.resolve(obj);
            });
            // Create the sequential chain and evaluate
            pchain.reduce(q.when, q()).done();
        });

    };
    function _readPokemonMoves (csvBaseLoc, obj) { 
        var pchain = [];
        return _csvHelper(path.join(csvBaseLoc, 'pokemon_moves.csv'), function (record) {
            record.name = record.identifier;
            delete record.identifier;
            if (record.version_group_id !== obj.versionGroup.id) {
            	// Only take the latest version's moves
            	// HINT: This would be why other version moves are not in the final DB.
            	return record;
            }

            pchain.push(function () {
                return obj.pdex.getMoveById(record.move_id)
                    .then(function (move) {
                        return obj.pdex.getPokemonById(record.pokemon_id)
                            .then(function(pkmn) {
                                return {move: move, pkmn: pkmn};
                            });
                    }).then(function (pkmnObj) {
                        pkmnObj.pkmn.moves = pkmnObj.pkmn.moves || {};
                        pkmnObj.pkmn.moves[record.version_group_id] = pkmnObj.pkmn.moves[record.version_group_id] || [];
                        // Ignore duplicate moves for now
                        // HINT: Levels the moves are obtained will be wrong
                        var matches = pkmnObj.pkmn.moves[record.version_group_id].filter(function (m) { return m.id === pkmnObj.move.id; });
                        if (matches.length === 0) {
                            pkmnObj.pkmn.moves[record.version_group_id].push(pkmnObj.move);
                            return obj.pdex.addPokemon({id: pkmnObj.pkmn.id, moves: pkmnObj.pkmn.moves});
                        }
                        
                        // Return nothing
                        return;
                    })
            });
            return record;
        }, function (promise) {
            // Add in the final resolve call
            pchain.push(function () {
                promise.resolve(obj);
            });
            // Create the sequential chain and evaluate
            pchain.reduce(q.when, q()).done();
        });
    };
        
})();