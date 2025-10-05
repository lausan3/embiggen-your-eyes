// Generalizable Feature Timeline Generator
// Uses feature properties + scientific models to estimate timeline

class FeatureAnalyzer {
    constructor() {
        // Crater Size-Frequency Distribution (SFD) models
        this.craterModels = {
            'MARS': {
                // Hartmann & Neukum 2001 production function
                getAge: (diameter, craterDensity) => {
                    // N(D) = cumulative crater density for diameter D
                    // Simplified model: larger craters = older surface
                    if (craterDensity > 0.01) return 3800000000; // Noachian
                    if (craterDensity > 0.001) return 3300000000; // Hesperian
                    return 1500000000; // Amazonian
                }
            },
            'MOON': {
                getAge: (diameter, craterDensity) => {
                    if (craterDensity > 0.02) return 3900000000; // Pre-Nectarian
                    if (craterDensity > 0.005) return 3700000000; // Imbrian
                    return 2000000000; // Eratosthenian/Copernican
                }
            }
        };

        // Volcanic feature models
        this.volcanicModels = {
            estimateAge: (planet, diameter, morphology) => {
                // Shield volcanoes are typically ancient on Mars
                if (planet === 'MARS') {
                    if (diameter > 200) {
                        // Large Tharsis volcanoes
                        return {
                            formation: 3700000000,
                            peak_activity: 3000000000,
                            late_activity: 500000000
                        };
                    }
                    // Smaller volcanoes
                    return {
                        formation: 3500000000,
                        peak_activity: 3200000000,
                        late_activity: 2900000000
                    };
                }
                return null;
            }
        };
    }

    // Analyze feature and generate timeline
    analyzeFeature(feature, planet, imageData = null) {
        const props = feature.properties;
        const featureType = props.featureType || this.classifyFromName(props.name);
        const diameter = props.diameter;

        console.log(`Analyzing ${props.name} (${featureType}) on ${planet}`);

        // Route to appropriate model
        if (featureType.includes('Crater')) {
            return this.analyzeCrater(props, planet, imageData);
        } else if (featureType.includes('Mons') || featureType.includes('Tholus') ||
                   featureType.includes('Patera')) {
            return this.analyzeVolcano(props, planet, imageData);
        } else if (featureType.includes('Vallis') || featureType.includes('Fossa')) {
            return this.analyzeChannel(props, planet, imageData);
        } else if (featureType.includes('Mare')) {
            return this.analyzeMare(props, planet, imageData);
        } else if (featureType.includes('Planitia') || featureType.includes('Planum')) {
            return this.analyzePlain(props, planet, imageData);
        }

        // Default generic timeline
        return this.generateGenericTimeline(props, planet);
    }

    // Crater analysis using size-frequency distribution
    analyzeCrater(props, planet, imageData) {
        const diameter = props.diameter || 10;
        const events = [];

        // Estimate crater density from surrounding area (would need image analysis)
        // For now, use diameter as proxy: larger = older
        const estimatedAge = this.estimateCraterAge(planet, diameter);

        events.push({
            phase: 'Impact Formation',
            years: estimatedAge,
            description: `High-velocity asteroid/comet impact creates ${diameter} km crater`,
            source: 'Crater chronology model',
            confidence: diameter > 50 ? 'high' : 'medium'
        });

        // Immediate post-impact processes
        events.push({
            phase: 'Crater Modification',
            years: estimatedAge,
            description: 'Wall collapse, central peak rebound, ejecta emplacement',
            source: 'Impact mechanics',
            confidence: 'high'
        });

        // Erosion/infill over time
        if (estimatedAge > 2000000000) {
            events.push({
                phase: 'Erosion Period',
                years: estimatedAge / 2,
                description: 'Wind, water, and mass wasting modify crater morphology',
                source: 'Erosion models',
                confidence: 'medium'
            });
        }

        events.push({
            phase: 'Current State',
            years: 0,
            description: `Well-preserved crater, ${diameter} km diameter`,
            source: 'Current observations',
            confidence: 'high'
        });

        return events;
    }

    // Volcano analysis
    analyzeVolcano(props, planet, imageData) {
        const diameter = props.diameter || 100;
        const events = [];

        const ages = this.volcanicModels.estimateAge(planet, diameter, 'shield');

        if (ages) {
            events.push({
                phase: 'Volcanic Province Formation',
                years: ages.formation,
                description: 'Regional mantle upwelling initiates volcanism',
                source: 'Tectonic models',
                confidence: 'medium'
            });

            events.push({
                phase: 'Shield Building',
                years: ages.peak_activity,
                description: 'Repeated basaltic eruptions construct main edifice',
                source: 'Volcanic stratigraphy',
                confidence: 'high'
            });

            events.push({
                phase: 'Late Activity',
                years: ages.late_activity,
                description: 'Declining eruption rate, summit caldera formation',
                source: 'Crater counting on flows',
                confidence: 'medium'
            });

            events.push({
                phase: 'Current State',
                years: 0,
                description: `Shield volcano, ${diameter} km diameter, possibly dormant`,
                source: 'Modern imaging',
                confidence: 'high'
            });
        }

        return events;
    }

    // Valley/channel analysis
    analyzeChannel(props, planet, imageData) {
        const events = [];

        if (planet === 'MARS') {
            events.push({
                phase: 'Tectonic Initiation',
                years: 3700000000,
                description: 'Crustal stress creates initial fractures',
                source: 'Structural geology',
                confidence: 'medium'
            });

            events.push({
                phase: 'Water Flow Period',
                years: 3500000000,
                description: 'Liquid water carves and widens channel system',
                source: 'Hydrological models',
                confidence: 'medium'
            });

            events.push({
                phase: 'Desiccation',
                years: 3000000000,
                description: 'Climate change causes water to disappear',
                source: 'Climate models',
                confidence: 'low'
            });

            events.push({
                phase: 'Current State',
                years: 0,
                description: 'Dry channel preserved in thin atmosphere',
                source: 'Current observations',
                confidence: 'high'
            });
        }

        return events;
    }

    // Lunar mare analysis
    analyzeMare(props, planet, imageData) {
        const events = [];

        events.push({
            phase: 'Basin Impact',
            years: 3900000000,
            description: 'Large impact excavates basin during Late Heavy Bombardment',
            source: 'Lunar chronology',
            confidence: 'high'
        });

        events.push({
            phase: 'Mare Flooding',
            years: 3700000000,
            description: 'Basaltic lava from mantle floods low-lying basin',
            source: 'Apollo sample dating',
            confidence: 'high'
        });

        events.push({
            phase: 'Volcanic Cessation',
            years: 3200000000,
            description: 'Lunar mantle cools, ending volcanic activity',
            source: 'Thermal models',
            confidence: 'high'
        });

        events.push({
            phase: 'Current State',
            years: 0,
            description: 'Dark basaltic plain, heavily cratered',
            source: 'LRO imaging',
            confidence: 'high'
        });

        return events;
    }

    // Plains analysis
    analyzePlain(props, planet, imageData) {
        const events = [];
        const diameter = props.diameter || 500;

        // Plains could be volcanic, sedimentary, or impact-modified
        if (planet === 'MARS') {
            events.push({
                phase: 'Surface Formation',
                years: 3500000000,
                description: 'Volcanic flows or sedimentary deposition creates plains',
                source: 'Geological mapping',
                confidence: 'medium'
            });

            events.push({
                phase: 'Modification',
                years: 3000000000,
                description: 'Wind erosion and dust deposition alter surface',
                source: 'Aeolian studies',
                confidence: 'medium'
            });

            events.push({
                phase: 'Current State',
                years: 0,
                description: `Smooth plains, ${diameter} km extent`,
                source: 'Orbital imaging',
                confidence: 'high'
            });
        }

        return events;
    }

    // Estimate crater age from diameter (simplified SFD)
    estimateCraterAge(planet, diameter) {
        if (planet === 'MARS') {
            if (diameter > 100) return 4000000000; // Ancient, Pre-Noachian
            if (diameter > 50) return 3700000000;  // Noachian
            if (diameter > 20) return 3200000000;  // Hesperian
            if (diameter > 5) return 1500000000;   // Amazonian
            return 500000000; // Recent
        } else if (planet === 'MOON') {
            if (diameter > 100) return 3950000000; // Pre-Nectarian
            if (diameter > 50) return 3700000000;  // Imbrian
            if (diameter > 20) return 2500000000;  // Eratosthenian
            return 800000000; // Copernican
        }
        return 2000000000; // Default
    }

    // Classify feature from name (when type is missing)
    classifyFromName(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('mons')) return 'Mons';
        if (lowerName.includes('crater')) return 'Crater';
        if (lowerName.includes('vallis')) return 'Vallis';
        if (lowerName.includes('mare')) return 'Mare';
        if (lowerName.includes('planitia')) return 'Planitia';
        if (lowerName.includes('planum')) return 'Planum';
        return 'Unknown';
    }

    // Generic fallback timeline
    generateGenericTimeline(props, planet) {
        return [{
            phase: 'Formation',
            years: 3500000000,
            description: `Geological feature formed during planetary evolution`,
            source: 'Estimated',
            confidence: 'low'
        }, {
            phase: 'Current State',
            years: 0,
            description: `Observable feature on ${planet}`,
            source: 'Observations',
            confidence: 'high'
        }];
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureAnalyzer;
}
