// Mars Chronostratigraphic System
// Maps geologic periods and units to absolute ages
// Based on Tanaka et al. 2014 and Hartmann & Neukum 2001

const MARS_CHRONOLOGY = {
    // Main Periods (in years before present)
    periods: {
        'Pre-Noachian': {
            start: 4500000000,
            end: 4100000000,
            description: 'Planet formation to earliest preserved crust'
        },
        'Noachian': {
            start: 4100000000,
            end: 3700000000,
            description: 'Heavy bombardment, valley networks, possible oceans',
            subdivisions: {
                'Early Noachian': { start: 4100000000, end: 3960000000 },
                'Middle Noachian': { start: 3960000000, end: 3830000000 },
                'Late Noachian': { start: 3830000000, end: 3700000000 }
            }
        },
        'Hesperian': {
            start: 3700000000,
            end: 3000000000,
            description: 'Widespread volcanism, outflow channels',
            subdivisions: {
                'Early Hesperian': { start: 3700000000, end: 3550000000 },
                'Late Hesperian': { start: 3550000000, end: 3000000000 }
            }
        },
        'Amazonian': {
            start: 3000000000,
            end: 0,
            description: 'Cold, dry climate, limited volcanism and erosion',
            subdivisions: {
                'Early Amazonian': { start: 3000000000, end: 1400000000 },
                'Middle Amazonian': { start: 1400000000, end: 400000000 },
                'Late Amazonian': { start: 400000000, end: 0 }
            }
        }
    },

    // Geologic unit prefixes used in USGS maps
    unitPrefixes: {
        // Amazonian units
        'Aa': 'Late Amazonian',
        'Am': 'Middle Amazonian',
        'Ae': 'Early Amazonian',
        'A': 'Amazonian',

        // Hesperian units
        'Hh': 'Late Hesperian',
        'Hl': 'Early Hesperian',
        'H': 'Hesperian',

        // Noachian units
        'Nn': 'Late Noachian',
        'Nm': 'Middle Noachian',
        'Ne': 'Early Noachian',
        'N': 'Noachian',

        // Mixed/transitional
        'HN': 'Hesperian-Noachian transition',
        'AH': 'Amazonian-Hesperian transition'
    },

    // Get age range for a geologic unit code
    getAgeRange: function(unitCode) {
        // Extract prefix (first 1-2 characters)
        for (let prefix in this.unitPrefixes) {
            if (unitCode.startsWith(prefix)) {
                const periodName = this.unitPrefixes[prefix];

                // Check subdivisions first
                for (let period in this.periods) {
                    if (this.periods[period].subdivisions) {
                        for (let subdivision in this.periods[period].subdivisions) {
                            if (subdivision === periodName) {
                                return {
                                    period: periodName,
                                    start: this.periods[period].subdivisions[subdivision].start,
                                    end: this.periods[period].subdivisions[subdivision].end,
                                    midpoint: (this.periods[period].subdivisions[subdivision].start +
                                              this.periods[period].subdivisions[subdivision].end) / 2
                                };
                            }
                        }
                    }
                    // Check main periods
                    if (period === periodName || this.periods[period].subdivisions &&
                        Object.keys(this.periods[period].subdivisions).some(s => s === periodName)) {
                        return {
                            period: periodName,
                            start: this.periods[period].start,
                            end: this.periods[period].end,
                            midpoint: (this.periods[period].start + this.periods[period].end) / 2
                        };
                    }
                }
            }
        }

        // Default to Amazonian if unknown
        return {
            period: 'Unknown (assumed Amazonian)',
            start: 3000000000,
            end: 0,
            midpoint: 1500000000
        };
    }
};

// Lunar Chronology
const LUNAR_CHRONOLOGY = {
    periods: {
        'Pre-Nectarian': {
            start: 4500000000,
            end: 3920000000,
            description: 'Moon formation to Nectaris basin impact'
        },
        'Nectarian': {
            start: 3920000000,
            end: 3850000000,
            description: 'Major basin-forming impacts'
        },
        'Lower Imbrian': {
            start: 3850000000,
            end: 3800000000,
            description: 'Imbrium basin impact and early mare volcanism'
        },
        'Upper Imbrian': {
            start: 3800000000,
            end: 3200000000,
            description: 'Peak mare volcanism'
        },
        'Eratosthenian': {
            start: 3200000000,
            end: 1100000000,
            description: 'Declining volcanism, moderate cratering'
        },
        'Copernican': {
            start: 1100000000,
            end: 0,
            description: 'Recent crater formation, minimal volcanism'
        }
    }
};

// Feature type age estimation
const FEATURE_AGE_ESTIMATES = {
    'Mars': {
        // Volcanic features
        'Mons': function(name, diameter) {
            if (name.includes('Olympus') || name.includes('Ascraeus') ||
                name.includes('Pavonis') || name.includes('Arsia')) {
                // Tharsis Montes - mostly Amazonian
                return { min: 3700000000, max: 100000000, typical: 2000000000 };
            }
            // Other volcanoes - typically Hesperian
            return { min: 3700000000, max: 2900000000, typical: 3300000000 };
        },

        // Impact craters - use crater size-frequency distribution
        'Crater': function(name, diameter) {
            if (diameter < 10) {
                return { min: 1000000000, max: 0, typical: 500000000 }; // Young
            } else if (diameter < 50) {
                return { min: 3000000000, max: 0, typical: 1500000000 };
            } else {
                return { min: 4100000000, max: 3000000000, typical: 3700000000 }; // Old, large
            }
        },

        // Channels and valleys
        'Vallis': function(name, diameter) {
            // Most valley networks are Noachian-Hesperian
            return { min: 4100000000, max: 3000000000, typical: 3500000000 };
        },

        // Plains
        'Planitia': function(name, diameter) {
            // Depends on location, but many are Hesperian
            return { min: 3700000000, max: 2900000000, typical: 3300000000 };
        },

        // Plateaus
        'Planum': function(name, diameter) {
            // Typically ancient
            return { min: 4100000000, max: 3500000000, typical: 3800000000 };
        }
    },

    'Moon': {
        'Mare': function(name, diameter) {
            // Maria are mostly Imbrian
            return { min: 3850000000, max: 3200000000, typical: 3500000000 };
        },

        'Crater': function(name, diameter) {
            if (diameter < 20) {
                return { min: 3200000000, max: 0, typical: 1600000000 };
            } else if (diameter < 100) {
                return { min: 3850000000, max: 1100000000, typical: 2500000000 };
            } else {
                return { min: 4100000000, max: 3850000000, typical: 3950000000 };
            }
        }
    }
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MARS_CHRONOLOGY, LUNAR_CHRONOLOGY, FEATURE_AGE_ESTIMATES };
}
