# Sample Political Decisions

This document provides examples of political decisions that players would encounter during gameplay. Each decision affects the political spectrum positioning and has practical gameplay effects.

## Decision 1: Resource Distribution

**Scenario:** Food shortages have struck your realm after a poor harvest season.

**Title:** Food Distribution Crisis

**Description:** Your granaries are running low, and the winter will be harsh. How will you distribute the remaining food resources?

**Options:**

1. **Free Market Solution**
   - **Text:** "Let the market determine food prices. Those who can afford it will eat."
   - **Effects:**
     - Economic: +0.15 (right shift)
     - Authority: -0.05 (libertarian shift)
     - Traditional: +0.05 (traditional shift)
     - Resources: +100 gold, -50 food
     - Population: -5% growth, merchants faction +10 happiness, workers faction -15 happiness
2. **Rationing System**
   - **Text:** "Implement a strict rationing system to ensure everyone gets the bare minimum."
   - **Effects:**
     - Economic: 0 (neutral)
     - Authority: +0.15 (authoritarian shift)
     - Traditional: 0 (neutral)
     - Resources: -50 gold, food consumption reduced by 15%
     - Population: -2% growth, military faction +5 happiness, merchants faction -5 happiness
3. **Communal Redistribution**
   - **Text:** "Confiscate excess food from the wealthy and redistribute to those in need."
   - **Effects:**
     - Economic: -0.20 (left shift)
     - Authority: +0.10 (authoritarian shift)
     - Traditional: -0.10 (progressive shift)
     - Resources: -100 gold, food redistribution equalizes shortages
     - Population: No change in growth, workers faction +15 happiness, aristocrats faction -20 happiness, merchants faction -10 happiness

## Decision 2: Religious Policy

**Scenario:** Religious diversity is growing in your realm, causing social tensions.

**Title:** Religious Tolerance Question

**Description:** Different faith groups are requesting recognition and rights. Your advisors await your decision on religious policy.

**Options:**

1. **State Religion**
   - **Text:** "Establish an official state religion and discourage other faiths."
   - **Effects:**
     - Economic: 0 (neutral)
     - Authority: +0.15 (authoritarian shift)
     - Traditional: +0.25 (traditional shift)
     - Resources: +50 influence from religious authorities
     - Population: Religious faction +20 happiness, intellectuals -15 happiness
     - Special: Unlocks religious buildings with unique bonuses, increases rebellion risk in mixed-faith regions
2. **Religious Freedom**
   - **Text:** "Allow all faiths to practice freely with no state interference."
   - **Effects:**
     - Economic: +0.05 (slight right shift from markets)
     - Authority: -0.20 (libertarian shift)
     - Traditional: -0.10 (progressive shift)
     - Resources: +25 gold from diverse trading practices
     - Population: Intellectuals +10 happiness, religious faction may split in opinion
     - Special: Increases trade efficiency, allows recruitment of units from different cultures
3. **Secular State**
   - **Text:** "Separate religion from state affairs entirely, promoting rationalism."
   - **Effects:**
     - Economic: 0 (neutral)
     - Authority: 0 (neutral)
     - Traditional: -0.20 (progressive shift)
     - Resources: +50 research points
     - Population: Intellectuals +20 happiness, religious faction -15 happiness
     - Special: Unlocks advanced research options, increases education efficiency

## Decision 3: Military Service

**Scenario:** Your growing empire needs more soldiers, but recruitment is lagging.

**Title:** Military Conscription Policy

**Description:** Your generals have requested more troops for defense and expansion. How will you address military service?

**Options:**

1. **Mandatory Service**
   - **Text:** "Implement mandatory military service for all able-bodied citizens."
   - **Effects:**
     - Economic: -0.05 (slight left shift)
     - Authority: +0.25 (authoritarian shift)
     - Traditional: +0.10 (traditional shift)
     - Resources: -100 gold for administration, +200 military manpower
     - Population: Military faction +15 happiness, workers faction -10 happiness
     - Special: Reduced training time for new units, decreased productivity in resource-generating buildings
2. **Professional Army**
   - **Text:** "Create a well-paid professional fighting force with career soldiers."
   - **Effects:**
     - Economic: +0.10 (right shift)
     - Authority: 0 (neutral)
     - Traditional: 0 (neutral)
     - Resources: -200 gold for higher wages, +100 elite military manpower
     - Population: Military faction +10 happiness, merchants faction +5 happiness
     - Special: Higher-quality military units, slower recruitment rate
3. **Militia System**
   - **Text:** "Establish local militias where citizens train part-time but maintain civilian lives."
   - **Effects:**
     - Economic: 0 (neutral)
     - Authority: -0.15 (libertarian shift)
     - Traditional: +0.05 (traditional shift)
     - Resources: -50 gold, +150 military manpower (mixed quality)
     - Population: +5 happiness across most factions
     - Special: Fast mobilization in homeland territory, lower effectiveness in distant campaigns

## Decision 4: Economic Crisis Response

**Scenario:** An economic downturn has caused widespread unemployment and unrest.

**Title:** Economic Recovery Plan

**Description:** Your economy is struggling, businesses are closing, and workers are protesting in the streets. How will you respond to the crisis?

**Options:**

1. **Government Intervention**
   - **Text:** "Fund public works projects to create jobs and stimulate the economy."
   - **Effects:**
     - Economic: -0.20 (left shift)
     - Authority: +0.10 (authoritarian shift)
     - Traditional: 0 (neutral)
     - Resources: -300 gold immediately, +25 gold per turn after 12 turns
     - Population: Workers faction +20 happiness, merchants faction -5 happiness
     - Special: Unlocks infrastructure upgrades, reduces unrest in major cities
2. **Free Market Recovery**
   - **Text:** "Reduce taxes and regulations to encourage business growth and recovery."
   - **Effects:**
     - Economic: +0.25 (right shift)
     - Authority: -0.15 (libertarian shift)
     - Traditional: +0.05 (traditional shift)
     - Resources: -150 gold from tax reduction, +50 gold per turn after 8 turns
     - Population: Merchants faction +25 happiness, workers faction -10 happiness
     - Special: Increases trade income, may increase inequality and unrest in poor regions
3. **Economic Reform**
   - **Text:** "Restructure the economy with a balance of regulations and freedoms."
   - **Effects:**
     - Economic: 0 (neutral)
     - Authority: 0 (neutral)
     - Traditional: -0.10 (progressive shift)
     - Resources: -200 gold immediately, +35 gold per turn after 10 turns
     - Population: +5 happiness across most factions
     - Special: More balanced long-term growth, reduces vulnerability to future crises

## Implementation Notes

These decisions would appear at regular intervals or be triggered by specific game conditions. The player's choices accumulate over time to shape their empire's political identity, affecting:

1. **Resource production and consumption rates**
2. **Population happiness and growth**
3. **Military capabilities and composition**
4. **Available building types and technologies**
5. **Diplomatic relations with other players**
6. **Vulnerability to rebellions and civil unrest**

Each decision should present meaningful choices with pros and cons rather than obvious "best" options. The consequences should be felt both immediately and in long-term gameplay effects.
