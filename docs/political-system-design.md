# Political System Design

## Core Concepts

### Political Spectrum

The game will use a multi-axis political spectrum to represent ideologies:

1. **Economic Axis** (-1.0 to 1.0)

   - Left (-1.0): Communism, socialism, collective ownership
   - Center (0.0): Mixed economy
   - Right (1.0): Capitalism, free markets, private ownership

2. **Authority Axis** (-1.0 to 1.0)

   - Libertarian (-1.0): Individual freedom, minimal state control
   - Moderate (0.0): Balanced authority
   - Authoritarian (1.0): Strong state control, centralized power

3. **Traditional Values Axis** (-1.0 to 1.0)
   - Progressive (-1.0): Embrace change, social reform
   - Moderate (0.0): Balanced approach to tradition
   - Traditional (1.0): Uphold traditional values and institutions

### Regime Types

Based on the political spectrum position, different regimes will emerge:

| Economic | Authority | Traditional | Regime Type            |
| -------- | --------- | ----------- | ---------------------- |
| -1.0     | 1.0       | \*          | Communist Dictatorship |
| -1.0     | -1.0      | -1.0        | Anarcho-Communism      |
| 1.0      | 1.0       | 1.0         | Fascist State          |
| 1.0      | -1.0      | \*          | Libertarian Capitalism |
| 0.0      | 0.0       | \*          | Liberal Democracy      |
| \*       | 1.0       | \*          | Authoritarian          |
| \*       | -1.0      | \*          | Libertarian            |

_Note: Asterisk (_) means this axis can vary without changing the regime type.\*

## Decision System

### Decision Structure

```typescript
interface Decision {
  id: string;
  title: string;
  description: string;
  timeTriggered: number;
  options: DecisionOption[];
  context: GameContext;
}

interface DecisionOption {
  id: string;
  text: string;
  effects: {
    economicShift: number;
    authorityShift: number;
    traditionalShift: number;
    resourceEffects: ResourceEffect[];
    populationEffects: PopulationEffect[];
    specialEffects: SpecialEffect[];
  };
  requirements?: {
    minimumResources?: Partial<Resources>;
    minimumPopulation?: number;
    currentRegime?: RegimeType[];
  };
}
```

### Decision Categories

1. **Economic Decisions**

   - Resource allocation
   - Tax policies
   - Trade regulations
   - Property rights

2. **Social Decisions**

   - Civil liberties
   - Cultural policies
   - Religion and state
   - Education

3. **Military Decisions**

   - Army organization
   - Military service
   - War doctrine
   - Defense priorities

4. **Foreign Policy**
   - Diplomatic approach
   - Alliance strategies
   - Border policies
   - Foreign aid

### Decision Timing

- Regular decisions: Occur at fixed intervals (configurable)
- Crisis decisions: Triggered by specific game events
- Opportunity decisions: Based on player actions or achievements

## Population and Happiness

### Population Groups

Different demographic groups will react differently to political decisions:

- **Intellectuals**: Favor progressive policies, sensitive to authority
- **Religious**: Favor traditional values
- **Merchants**: Favor economic freedom, dislike high taxation
- **Workers**: Favor economic left policies, workers' rights
- **Military**: Favor authority, national strength
- **Aristocrats**: Favor traditional and right economic policies

### Faction Support System

```typescript
interface PopulationFaction {
  id: string;
  name: string;
  size: number; // Percentage of total population
  happiness: number; // -1.0 to 1.0
  idealPolitics: {
    economic: number;
    authority: number;
    traditional: number;
  };
  influence: number; // How much this faction affects stability
}
```

### Stability and Rebellion

- Low happiness across multiple factions increases instability
- Different factions may rebel depending on political choices
- Rebellion risk increases with distance from faction's ideal politics
- Critical instability can lead to regime collapse or civil war

## Gameplay Effects

### Resource Production

- Different political systems affect resource production rates
- Economic policies determine taxation and distribution
- Authority levels affect infrastructure efficiency
- Traditional values influence innovation and adaptation

### Military Capabilities

- Left economic policies may reduce military funding but increase conscription
- Right economic policies may enable better equipment but smaller forces
- Authoritarian regimes can mobilize faster but may face resistance
- Libertarian regimes may have more innovative military approaches

### Diplomatic Relations

- Similar political systems tend to have better relations
- Opposing ideologies may create natural rivalries
- Trade agreements more likely between compatible economic systems
- Military alliances influenced by authority and traditional values

## Implementation Phases

### Phase 1: Basic Political Spectrum

- Implement the three-axis system
- Create initial decision framework
- Basic regime type determination

### Phase 2: Population Response

- Add population factions
- Implement happiness calculations
- Create faction-specific responses to decisions

### Phase 3: Rebellion and Stability

- Add instability mechanics
- Implement rebellion triggers
- Create regime change events

### Phase 4: Advanced Politics

- Dynamic faction growth and decline
- International ideological influence
- Historical events and political movements
