
Usage:
    
    var loadCSV = function() {
      //Get the pokedex data from our CSV files
      pdex(null, './data/csv');
    },

    getPokemon = function(pokedex) {
      // You now have a pokedex object and can pull data out
      pokedex.getPokemonByName('venusaur');
    },

    doCoolStuff = function(pokemon) {
      //Now you can do cool things with your pokemon object in JSON form
      console.log(pokemon);
    };

    loadCSV()
    .then( getPokemon )
    .then( doCoolStuff )
    .done()

Output:

    { id: '3',
        species_id: '3',
        height: '20',
        weight: '1000',
        base_experience: '236',
        order: '3',
        is_default: '1',
        name: 'venusaur',
        stats: {
            hp: { base: '80', effort: '0' },
            attack: { base: '82', effort: '0' },
            defense: { base: '83', effort: '0' },
            'special-attack': { base: '100', effort: '2' },
            'special-defense': { base: '100', effort: '1' },
            speed: { base: '80', effort: '0' } 
        }
    }
