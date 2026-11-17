import type { Dilemma } from '../types';

// The daily questions. One is drawn each turn; the whole deck is used before
// any repeats. An answer can have one-off effects (treasury, stability, faction
// approval), move the nation's ideology, or move a standing policy (taxes,
// schooling, public health, workers' protections) that then acts every turn. Axis deltas point toward Liberty / Market / Reform / Openness,
// so "liberty −12" reads as "Authority +12". Treasury deltas scale with era.

export const FIRST_DILEMMA = 'docks-strike';

export const DILEMMAS: Dilemma[] = [
  {
    id: 'docks-strike', title: 'The Saline Docks strike', category: 'Labour',
    body: 'Dockworkers have shut the capital’s port over twelve-hour shifts. Ships wait at anchor and the Merchant Houses are counting their losses by the hour.',
    voices: [
      { faction: 'dockworkers', name: 'Guild steward', quote: 'We unload the wealth of this nation and go home too tired to eat.' },
      { faction: 'merchants', name: 'House factor', quote: 'Every day the cranes stand still, our buyers sail to Lune instead.' },
    ],
    choices: [
      { title: 'Break the strike', desc: 'Send the watch to reopen the port by force.', outcome: 'The port reopens under guard. The Guild will not forget it.',
        effects: [{ target: 'welfare', delta: -1 }, { target: 'treasury', delta: 60 }, { target: 'stability', delta: -8 }, { target: 'dockworkers', delta: -30 }, { target: 'merchants', delta: 10 }, { target: 'liberty', delta: -12 }] },
      { title: 'Negotiate shorter shifts', desc: 'The state pays the difference for a season.', outcome: 'Ten-hour shifts, paid for from the treasury. The cranes move again.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'treasury', delta: -40 }, { target: 'stability', delta: 4 }, { target: 'dockworkers', delta: 15 }, { target: 'merchants', delta: -5 }, { target: 'market', delta: -6 }] },
      { title: 'Give the Guild an Assembly seat', desc: 'Labour gets a permanent voice in government.', outcome: 'A docker takes the oath of office. The Merchant Houses walk out of the chamber.',
        effects: [{ target: 'treasury', delta: -10 }, { target: 'stability', delta: 9 }, { target: 'dockworkers', delta: 35 }, { target: 'merchants', delta: -18 }, { target: 'liberty', delta: 10 }] },
      { title: 'Bring in foreign dockers', desc: 'Ask a friendly nation to send its own crews.', outcome: 'Foreign crews work the cranes while the Guild watches from the gates.',
        requires: { target: 'influence', min: 60, label: 'Needs 60 influence' },
        effects: [{ target: 'influence', delta: -30 }, { target: 'treasury', delta: 40 }, { target: 'dockworkers', delta: -15 }, { target: 'openness', delta: 8 }] },
    ],
  },
  {
    id: 'grain-price', title: 'Bread at twice the price', category: 'Economy',
    body: 'A poor harvest has doubled the price of grain. Bakers are closing early and queues form before dawn.',
    voices: [
      { faction: 'settlers', name: 'Farm delegate', quote: 'For once the land pays us fairly. Do not take that away.' },
      { faction: 'dockworkers', name: 'Guild mother', quote: 'My children do not eat fair prices. They eat bread.' },
    ],
    choices: [
      { title: 'Cap the price of bread', desc: 'Fix the price by law and police the bakeries.', outcome: 'Bread is cheap again. Some of it is sold out of back doors.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'stability', delta: 5 }, { target: 'dockworkers', delta: 10 }, { target: 'settlers', delta: -12 }, { target: 'market', delta: -10 }] },
      { title: 'Buy grain abroad', desc: 'Spend from the treasury to fill the granaries.', outcome: 'Foreign grain arrives by the shipload. The price settles.',
        effects: [{ target: 'treasury', delta: -70 }, { target: 'stability', delta: 4 }, { target: 'openness', delta: 6 }, { target: 'dockworkers', delta: 5 }] },
      { title: 'Let the market settle it', desc: 'High prices will bring more grain in time.', outcome: 'Farmers plant every spare field. It is a hungry season until then.',
        effects: [{ target: 'welfare', delta: -1 }, { target: 'stability', delta: -6 }, { target: 'settlers', delta: 10 }, { target: 'merchants', delta: 6 }, { target: 'dockworkers', delta: -10 }, { target: 'market', delta: 10 }] },
    ],
  },
  {
    id: 'press-law', title: 'The pamphlet war', category: 'Liberty',
    body: 'A satirical paper has printed the private debts of three ministers. The ministers want the press shut down. The printers want a law that protects them.',
    voices: [
      { faction: 'clergy', name: 'High chaplain', quote: 'A nation that mocks its elders will soon have none worth the name.' },
      { faction: 'merchants', name: 'Printer', quote: 'If I can be shut for the truth, what will you do to me for a lie?' },
    ],
    choices: [
      { title: 'Close the paper', desc: 'Seize the presses and fine the editor.', outcome: 'The presses go quiet. Handwritten copies appear overnight.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 3 }, { target: 'clergy', delta: 8 }, { target: 'merchants', delta: -6 }, { target: 'liberty', delta: -12 }] },
      { title: 'Pass a free press law', desc: 'No paper may be closed without a trial.', outcome: 'The law passes. Within a week there are four new papers, two of them worse.',
        effects: [{ target: 'press', delta: 1 }, { target: 'stability', delta: -3 }, { target: 'influence', delta: 6 }, { target: 'clergy', delta: -8 }, { target: 'liberty', delta: 12 }] },
      { title: 'Make the ministers pay their debts', desc: 'Side with neither; clean house instead.', outcome: 'Two ministers settle up and one resigns. The paper finds a new target.',
        effects: [{ target: 'stability', delta: 2 }, { target: 'treasury', delta: 20 }, { target: 'reform', delta: 6 }] },
    ],
  },
  {
    id: 'refugees', title: 'Boats on the horizon', category: 'Borders',
    body: 'Several thousand people fleeing a famine across the sea have reached your coast. They ask for land and work.',
    voices: [
      { faction: 'settlers', name: 'Frontier elder', quote: 'There is empty land enough. We were strangers here once.' },
      { faction: 'clergy', name: 'Parish warden', quote: 'They keep other customs. Charity, yes. A home, no.' },
    ],
    choices: [
      { title: 'Welcome them as citizens', desc: 'Grant land on the frontier and full rights.', outcome: 'New villages rise along the frontier within the year.',
        effects: [{ target: 'immigration', delta: 1 }, { target: 'population', delta: 4 }, { target: 'treasury', delta: -40 }, { target: 'settlers', delta: 8 }, { target: 'clergy', delta: -10 }, { target: 'openness', delta: 12 }] },
      { title: 'Shelter them for a season', desc: 'Camps and food, then passage onward.', outcome: 'The camps empty by spring. A few families quietly stay.',
        effects: [{ target: 'treasury', delta: -30 }, { target: 'influence', delta: 5 }, { target: 'openness', delta: 3 }] },
      { title: 'Turn the boats away', desc: 'The coast guard escorts them back to sea.', outcome: 'The boats turn south. Other nations take note of it.',
        effects: [{ target: 'immigration', delta: -1 }, { target: 'stability', delta: 3 }, { target: 'influence', delta: -8 }, { target: 'clergy', delta: 6 }, { target: 'settlers', delta: -6 }, { target: 'openness', delta: -12 }] },
    ],
  },
  {
    id: 'conscription', title: 'A call to arms', category: 'Army',
    body: 'The general staff says the army is too small to hold the borders. They ask for the power to draft every citizen of fighting age.',
    voices: [
      { faction: 'settlers', name: 'Militia captain', quote: 'We already guard the frontier unpaid. Let the city boys take a turn.' },
      { faction: 'merchants', name: 'Mill owner', quote: 'Take my workers and you take my taxes with them.' },
    ],
    choices: [
      { title: 'Introduce the draft', desc: 'Two years of service for every citizen.', outcome: 'Recruiting halls open in every town. Not everyone comes willingly.',
        effects: [{ target: 'military', delta: 1 }, { target: 'stability', delta: -5 }, { target: 'merchants', delta: -8 }, { target: 'settlers', delta: 6 }, { target: 'liberty', delta: -14 }, { target: 'treasury', delta: 50 }] },
      { title: 'Pay for volunteers', desc: 'Raise army wages instead.', outcome: 'Better pay fills the ranks, slowly.',
        effects: [{ target: 'treasury', delta: -60 }, { target: 'stability', delta: 2 }, { target: 'market', delta: 4 }] },
      { title: 'Refuse the generals', desc: 'The army answers to the people, not the reverse.', outcome: 'The generals salute and leave. They are not pleased.',
        effects: [{ target: 'military', delta: -1 }, { target: 'stability', delta: 2 }, { target: 'liberty', delta: 10 }, { target: 'merchants', delta: 5 }, { target: 'settlers', delta: -5 }] },
    ],
  },
  {
    id: 'old-temple', title: 'The temple and the railway', category: 'Tradition',
    body: 'Engineers want to run a new freight line straight through the grounds of the oldest temple in the country. Going around adds a year and a fortune.',
    voices: [
      { faction: 'clergy', name: 'Temple keeper', quote: 'Nine hundred years of prayer, and you offer us a timetable.' },
      { faction: 'merchants', name: 'Rail investor', quote: 'The dead are patient. Our creditors are not.' },
    ],
    choices: [
      { title: 'Build through the grounds', desc: 'Move the shrine stone by stone.', outcome: 'The line opens on time. The shrine stands, rebuilt, beside the tracks.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'treasury', delta: 50 }, { target: 'clergy', delta: -20 }, { target: 'merchants', delta: 10 }, { target: 'reform', delta: 12 }] },
      { title: 'Go around', desc: 'Pay the extra and keep the temple untouched.', outcome: 'The line bends around the hill. Pilgrims now arrive by train.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'treasury', delta: -70 }, { target: 'clergy', delta: 15 }, { target: 'stability', delta: 3 }, { target: 'reform', delta: -8 }] },
      { title: 'Let the district vote', desc: 'Those who live there decide.', outcome: 'The vote is close and bitter. The temple stays, by forty votes.',
        effects: [{ target: 'treasury', delta: -30 }, { target: 'clergy', delta: 6 }, { target: 'stability', delta: -2 }, { target: 'liberty', delta: 8 }] },
    ],
  },
  {
    id: 'tariff', title: 'Cheap steel from abroad', category: 'Trade',
    body: 'Foreign steel is selling for less than your own mills can make it. Mill owners want a tariff. Builders want the cheap steel.',
    voices: [
      { faction: 'dockworkers', name: 'Foundry hand', quote: 'Cheap steel is dear enough when the mill gate is locked.' },
      { faction: 'merchants', name: 'Shipbuilder', quote: 'Tax my steel and I build fewer ships. It is that simple.' },
    ],
    choices: [
      { title: 'Raise a tariff wall', desc: 'Tax foreign steel at the border.', outcome: 'The mills stay open. Prices rise, and so do tempers abroad.',
        effects: [{ target: 'treasury', delta: 40 }, { target: 'dockworkers', delta: 10 }, { target: 'merchants', delta: -8 }, { target: 'relations', delta: -6 }, { target: 'openness', delta: -10 }] },
      { title: 'Keep the borders open', desc: 'Let buyers choose.', outcome: 'Two mills close. The shipyards have their best year on record.',
        effects: [{ target: 'treasury', delta: 20 }, { target: 'dockworkers', delta: -12 }, { target: 'merchants', delta: 10 }, { target: 'relations', delta: 4 }, { target: 'openness', delta: 10 }, { target: 'market', delta: 5 }] },
      { title: 'Buy the mills for the state', desc: 'Run them at a loss to keep the jobs.', outcome: 'The mills fly the national flag. The ledgers are less proud.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'treasury', delta: -60 }, { target: 'dockworkers', delta: 15 }, { target: 'merchants', delta: -10 }, { target: 'market', delta: -12 }] },
    ],
  },
  {
    id: 'land-reform', title: 'Whose fields?', category: 'Land',
    body: 'A handful of families own most of the good farmland and rent it out. Tenant farmers are marching on the capital to demand the land they work.',
    voices: [
      { faction: 'settlers', name: 'Tenant farmer', quote: 'My grandfather cleared that field. I pay rent to a man who has never seen it.' },
      { faction: 'merchants', name: 'Landholder', quote: 'Take one deed by force and no deed in this country is worth the paper.' },
    ],
    choices: [
      { title: 'Break up the estates', desc: 'Give tenants the land they farm.', outcome: 'Deeds are handed out in village squares. The old families send their money abroad.',
        effects: [{ target: 'settlers', delta: 20 }, { target: 'merchants', delta: -18 }, { target: 'stability', delta: -3 }, { target: 'market', delta: -12 }, { target: 'reform', delta: 8 }] },
      { title: 'Offer state loans to buy land', desc: 'Tenants may buy, at a fair price.', outcome: 'It is slow, but each year more farmers own their fields.',
        effects: [{ target: 'treasury', delta: -50 }, { target: 'settlers', delta: 10 }, { target: 'stability', delta: 2 }, { target: 'reform', delta: 4 }] },
      { title: 'Uphold the deeds', desc: 'Property is property.', outcome: 'The march is dispersed. The rents go up at the next quarter.',
        effects: [{ target: 'settlers', delta: -15 }, { target: 'merchants', delta: 12 }, { target: 'stability', delta: -4 }, { target: 'market', delta: 10 }, { target: 'reform', delta: -6 }] },
    ],
  },
  {
    id: 'spy', title: 'A spy in the ministry', category: 'Security',
    body: 'A clerk in the foreign ministry has been caught copying dispatches for another power. The security chief wants wider powers to find the rest of the ring.',
    voices: [
      { faction: 'clergy', name: 'Security chief', quote: 'One rat is seen. Ten are in the walls.' },
      { faction: 'merchants', name: 'Assembly deputy', quote: 'Today they read the clerk’s letters. Tomorrow, yours.' },
    ],
    choices: [
      { title: 'Grant emergency powers', desc: 'Searches without warrant for one year.', outcome: 'Four more arrests follow. So do a great many searches.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 4 }, { target: 'influence', delta: 4 }, { target: 'merchants', delta: -6 }, { target: 'liberty', delta: -12 }] },
      { title: 'A public trial', desc: 'Try the clerk in open court.', outcome: 'The trial is fair and fully reported. The ring goes to ground.',
        effects: [{ target: 'press', delta: 1 }, { target: 'influence', delta: -4 }, { target: 'stability', delta: 2 }, { target: 'liberty', delta: 10 }] },
      { title: 'Turn the spy', desc: 'Feed false dispatches back to their masters.', outcome: 'For months, a rival reads exactly what you want it to read.',
        requires: { target: 'influence', min: 30, label: 'Needs 30 influence' },
        effects: [{ target: 'influence', delta: 12 }, { target: 'relations', delta: -3 }] },
    ],
  },
  {
    id: 'school-books', title: 'What the children learn', category: 'Education',
    body: 'The schools need new books. The Clergy have a catechism ready. The university has a science primer. There is money for one.',
    voices: [
      { faction: 'clergy', name: 'Schoolmistress', quote: 'Teach a child sums without virtue and you have made a clever thief.' },
      { faction: 'settlers', name: 'Young engineer', quote: 'Virtue did not drain the marsh. A pump did.' },
    ],
    choices: [
      { title: 'Print the catechism', desc: 'Tradition first.', outcome: 'Every child can recite the founding prayers. Fewer can do their sums.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'education', delta: -1 }, { target: 'clergy', delta: 14 }, { target: 'stability', delta: 4 }, { target: 'reform', delta: -12 }] },
      { title: 'Print the science primer', desc: 'A modern nation needs modern minds.', outcome: 'The first class of surveyors graduates within the year.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'education', delta: 1 }, { target: 'clergy', delta: -12 }, { target: 'settlers', delta: 6 }, { target: 'influence', delta: 4 }, { target: 'reform', delta: 12 }] },
      { title: 'Pay for both', desc: 'Find the money somewhere.', outcome: 'Both books arrive. The children carry heavier bags.',
        effects: [{ target: 'education', delta: 1 }, { target: 'treasury', delta: -60 }, { target: 'clergy', delta: 5 }, { target: 'settlers', delta: 4 }] },
    ],
  },
  {
    id: 'monopoly', title: 'One house to rule the trade', category: 'Economy',
    body: 'The largest Merchant House has quietly bought its three biggest competitors. It now sets the price of salt, rope and lamp oil across the country.',
    voices: [
      { faction: 'merchants', name: 'House matriarch', quote: 'We did not steal this trade. We were simply better at it.' },
      { faction: 'dockworkers', name: 'Chandler', quote: 'Better? I pay what they say, or I do not open.' },
    ],
    choices: [
      { title: 'Break it up', desc: 'Force the House to sell what it bought.', outcome: 'The House is split in four. Prices fall, and so do its donations.',
        effects: [{ target: 'merchants', delta: -16 }, { target: 'dockworkers', delta: 8 }, { target: 'stability', delta: 2 }, { target: 'reform', delta: 6 }, { target: 'market', delta: -4 }] },
      { title: 'Tax it heavily', desc: 'Let it stand, and take a share.', outcome: 'The House pays, grumbling, and passes the cost along.',
        effects: [{ target: 'treasury', delta: 80 }, { target: 'merchants', delta: -8 }, { target: 'dockworkers', delta: -4 }] },
      { title: 'Leave it be', desc: 'Success should not be punished.', outcome: 'The House thanks you publicly. The price of lamp oil rises again.',
        effects: [{ target: 'welfare', delta: -1 }, { target: 'merchants', delta: 14 }, { target: 'dockworkers', delta: -10 }, { target: 'stability', delta: -2 }, { target: 'market', delta: 12 }] },
    ],
  },
  {
    id: 'festival', title: 'The founding festival', category: 'Culture',
    body: 'The anniversary of the founding is near. The Clergy plan the old procession. A reform club wants a modern exhibition of industry instead.',
    voices: [
      { faction: 'clergy', name: 'Procession master', quote: 'The route has not changed in living memory. That is the point of it.' },
      { faction: 'merchants', name: 'Exhibitor', quote: 'Show the world a turbine and they will remember us. Nobody remembers a parade.' },
    ],
    choices: [
      { title: 'The old procession', desc: 'As it has always been.', outcome: 'Candles fill the streets. For one night nobody argues.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'treasury', delta: -20 }, { target: 'stability', delta: 6 }, { target: 'clergy', delta: 10 }, { target: 'reform', delta: -8 }] },
      { title: 'An exhibition of industry', desc: 'Invite foreign guests.', outcome: 'Envoys from three nations tour the machine hall and leave impressed.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'treasury', delta: -50 }, { target: 'influence', delta: 10 }, { target: 'merchants', delta: 8 }, { target: 'clergy', delta: -8 }, { target: 'reform', delta: 8 }, { target: 'openness', delta: 6 }] },
      { title: 'A working day like any other', desc: 'Save the money.', outcome: 'The day passes. People notice.',
        effects: [{ target: 'treasury', delta: 30 }, { target: 'stability', delta: -4 }, { target: 'clergy', delta: -4 }] },
    ],
  },
  {
    id: 'plague', title: 'Fever in the harbour quarter', category: 'Health',
    body: 'A fever is spreading through the harbour quarter. Doctors urge closing the port for a month. The port is a third of the nation’s trade.',
    voices: [
      { faction: 'dockworkers', name: 'Harbour doctor', quote: 'I buried six this week. Next week it will be sixty.' },
      { faction: 'merchants', name: 'Harbour master', quote: 'A month closed and half these firms never reopen.' },
    ],
    choices: [
      { title: 'Close the port', desc: 'Quarantine the quarter, and pay the idle workers.', outcome: 'The fever burns out behind the cordon. The quarter does not forget who fed it.',
        effects: [{ target: 'health', delta: 1 }, { target: 'treasury', delta: -80 }, { target: 'dockworkers', delta: 12 }, { target: 'merchants', delta: -8 }, { target: 'stability', delta: 4 }, { target: 'openness', delta: -6 }] },
      { title: 'Keep trading', desc: 'Inspect ships, but stay open.', outcome: 'Trade continues. The fever reaches two more towns before it fades.',
        effects: [{ target: 'health', delta: -1 }, { target: 'treasury', delta: 30 }, { target: 'population', delta: -3 }, { target: 'stability', delta: -6 }, { target: 'dockworkers', delta: -12 }, { target: 'merchants', delta: 6 }] },
      { title: 'Ask the Clergy to run hospitals', desc: 'They have the buildings and the volunteers.', outcome: 'Temple halls fill with cots. The Clergy’s standing has never been higher.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'treasury', delta: -30 }, { target: 'clergy', delta: 14 }, { target: 'population', delta: -1 }, { target: 'reform', delta: -6 }] },
    ],
  },
  {
    id: 'frontier-charter', title: 'The frontier charter', category: 'Land',
    body: 'Settlers on the edge of your territory want a charter: they will govern themselves and keep their own militia, and in return keep the border without pay.',
    voices: [
      { faction: 'settlers', name: 'Frontier speaker', quote: 'The capital sends us tax collectors and no soldiers. We will take neither.' },
      { faction: 'clergy', name: 'Royal archivist', quote: 'A nation with two laws is two nations waiting to happen.' },
    ],
    choices: [
      { title: 'Grant the charter', desc: 'Self-rule on the frontier.', outcome: 'Frontier towns elect their own reeves. Tax receipts dip; raids stop.',
        effects: [{ target: 'settlers', delta: 18 }, { target: 'treasury', delta: -30 }, { target: 'stability', delta: 3 }, { target: 'liberty', delta: 10 }] },
      { title: 'Send governors instead', desc: 'The capital’s law, everywhere.', outcome: 'Governors ride out with an escort. They are obeyed, coldly.',
        effects: [{ target: 'settlers', delta: -16 }, { target: 'treasury', delta: 30 }, { target: 'clergy', delta: 4 }, { target: 'liberty', delta: -10 }] },
      { title: 'Pay the militia from the treasury', desc: 'Keep them loyal with wages.', outcome: 'The militia takes the coin and the oath that comes with it.',
        effects: [{ target: 'treasury', delta: -60 }, { target: 'settlers', delta: 8 }, { target: 'stability', delta: 4 }] },
    ],
  },
  {
    id: 'foreign-bank', title: 'A loan with strings', category: 'Finance',
    body: 'A foreign banking house offers a large loan on easy terms. In return its agents would sit on your customs board.',
    voices: [
      { faction: 'merchants', name: 'Treasurer', quote: 'Money this cheap comes once in a generation.' },
      { faction: 'clergy', name: 'Elder deputy', quote: 'He who holds the customs house holds the keys to the city.' },
    ],
    choices: [
      { title: 'Take the loan', desc: 'Gold now, influence later.', outcome: 'The vaults are full. A foreign gentleman now attends every customs meeting.',
        effects: [{ target: 'treasury', delta: 160 }, { target: 'influence', delta: -10 }, { target: 'clergy', delta: -6 }, { target: 'openness', delta: 10 }] },
      { title: 'Refuse it', desc: 'We pay our own way.', outcome: 'The bankers bow and leave. The budget stays tight.',
        effects: [{ target: 'stability', delta: 2 }, { target: 'clergy', delta: 6 }, { target: 'openness', delta: -8 }] },
      { title: 'Issue bonds to your own citizens', desc: 'Borrow at home instead.', outcome: 'Citizens queue to buy a share in the nation. It raises less, but it is theirs.',
        effects: [{ target: 'treasury', delta: 70 }, { target: 'merchants', delta: 6 }, { target: 'market', delta: 6 }] },
    ],
  },
  {
    id: 'secret-police', title: 'Whispers in the taverns', category: 'Order',
    body: 'Talk against the government is growing louder in the taverns. The interior minister proposes a corps of informers to listen.',
    voices: [
      { faction: 'clergy', name: 'Interior minister', quote: 'Every riot began as a conversation someone failed to overhear.' },
      { faction: 'dockworkers', name: 'Tavern keeper', quote: 'Put an ear at every table and soon no one will speak, to you or for you.' },
    ],
    choices: [
      { title: 'Create the corps', desc: 'Informers in every quarter.', outcome: 'The taverns grow quiet. Whether they grow loyal is another matter.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 7 }, { target: 'dockworkers', delta: -10 }, { target: 'treasury', delta: -30 }, { target: 'liberty', delta: -14 }] },
      { title: 'Hold open assemblies', desc: 'Let people say it to your face.', outcome: 'The first assembly lasts nine hours. Much is shouted; something is learned.',
        effects: [{ target: 'press', delta: 1 }, { target: 'stability', delta: -2 }, { target: 'dockworkers', delta: 8 }, { target: 'settlers', delta: 5 }, { target: 'liberty', delta: 12 }] },
      { title: 'Ignore it', desc: 'Talk is only talk.', outcome: 'The talk continues. So does everything else.',
        effects: [{ target: 'stability', delta: -3 }] },
    ],
  },
  {
    id: 'war-profiteers', title: 'Boots made of paper', category: 'War', when: 'war',
    body: 'A contractor has been supplying the army with boots that fall apart in the rain. He is also the Merchant Houses’ largest donor.',
    voices: [
      { faction: 'settlers', name: 'Infantry sergeant', quote: 'My men march barefoot while he builds a third house.' },
      { faction: 'merchants', name: 'House lawyer', quote: 'A contract dispute, nothing more. Courts exist for this.' },
    ],
    choices: [
      { title: 'Seize his factories', desc: 'The state makes its own boots now.', outcome: 'State workshops turn out boots that last. The Houses close ranks.',
        effects: [{ target: 'treasury', delta: 60 }, { target: 'merchants', delta: -18 }, { target: 'settlers', delta: 10 }, { target: 'market', delta: -12 }] },
      { title: 'Fine him and move on', desc: 'A quick penalty, quietly.', outcome: 'He pays without complaint, which tells you the fine was too small.',
        effects: [{ target: 'treasury', delta: 40 }, { target: 'settlers', delta: -4 }, { target: 'stability', delta: -2 }] },
      { title: 'Try him for treason', desc: 'Make an example in wartime.', outcome: 'The verdict is swift. No contractor is late with a delivery again.',
        effects: [{ target: 'stability', delta: 4 }, { target: 'merchants', delta: -12 }, { target: 'settlers', delta: 8 }, { target: 'liberty', delta: -8 }] },
    ],
  },
  {
    id: 'war-weariness', title: 'Letters from the front', category: 'War', when: 'war',
    body: 'Soldiers’ letters describing the fighting are being read aloud in town squares. Crowds are asking how much longer.',
    voices: [
      { faction: 'clergy', name: 'Army chaplain', quote: 'Grief shared in the open heals. Grief hidden festers.' },
      { faction: 'settlers', name: 'Colonel', quote: 'Those letters tell the enemy exactly where we are thin.' },
    ],
    choices: [
      { title: 'Censor the mail', desc: 'Officers read every letter first.', outcome: 'The letters grow short and cheerful. Nobody believes them.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 3 }, { target: 'settlers', delta: -6 }, { target: 'liberty', delta: -10 }] },
      { title: 'Address the nation', desc: 'Say plainly what the war is for.', outcome: 'The speech is printed in every paper. For now, the squares are calm.',
        effects: [{ target: 'stability', delta: 5 }, { target: 'influence', delta: -6 }, { target: 'liberty', delta: 4 }] },
      { title: 'Double the widows’ pension', desc: 'Pay the debt the nation owes.', outcome: 'It does not bring anyone back. It is noticed all the same.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'treasury', delta: -70 }, { target: 'stability', delta: 6 }, { target: 'settlers', delta: 8 }, { target: 'market', delta: -4 }] },
    ],
  },
  {
    id: 'peace-dividend', title: 'An army with nothing to do', category: 'Army', when: 'peace',
    body: 'The borders are quiet. The finance minister wants soldiers put to work building roads. The generals call it an insult.',
    voices: [
      { faction: 'merchants', name: 'Finance minister', quote: 'We pay ten thousand men to polish buttons.' },
      { faction: 'settlers', name: 'General', quote: 'A soldier with a shovel forgets the rifle. Our neighbours will not.' },
    ],
    choices: [
      { title: 'Soldiers build roads', desc: 'Earn their keep in peacetime.', outcome: 'New roads reach the frontier. Drill suffers a little.',
        effects: [{ target: 'military', delta: -1 }, { target: 'treasury', delta: 60 }, { target: 'settlers', delta: -6 }, { target: 'merchants', delta: 8 }, { target: 'reform', delta: 6 }] },
      { title: 'Keep them drilling', desc: 'Readiness has no price.', outcome: 'Parades are crisp. Neighbouring envoys take careful notes.',
        effects: [{ target: 'military', delta: 1 }, { target: 'settlers', delta: 6 }, { target: 'relations', delta: -3 }, { target: 'stability', delta: 2 }, { target: 'liberty', delta: -4 }] },
      { title: 'Hold joint exercises with a neighbour', desc: 'Make a friend of it.', outcome: 'Two armies share a field and a great deal of beer.',
        requires: { target: 'openness', min: 55, label: 'Needs an open nation (Openness 55)' },
        effects: [{ target: 'relations', delta: 8 }, { target: 'influence', delta: 5 }, { target: 'openness', delta: 5 }] },
    ],
  },
  {
    id: 'votes', title: 'Who may vote?', category: 'Constitution',
    body: 'Only landowners may vote for the Assembly. A petition with a hundred thousand names demands the vote for every adult.',
    voices: [
      { faction: 'dockworkers', name: 'Petitioner', quote: 'I pay the salt tax like any landlord. Where is my vote?' },
      { faction: 'merchants', name: 'Assembly elder', quote: 'Give the vote to those with nothing, and they will vote to have everything.' },
    ],
    choices: [
      { title: 'Votes for all adults', desc: 'One person, one vote.', outcome: 'Polling queues stretch around the block, and night schools fill with new voters learning to read the ballot.',
        effects: [{ target: 'education', delta: 1 }, { target: 'dockworkers', delta: 16 }, { target: 'settlers', delta: 8 }, { target: 'merchants', delta: -12 }, { target: 'clergy', delta: -6 }, { target: 'liberty', delta: 14 }, { target: 'reform', delta: 6 }] },
      { title: 'Votes for taxpayers', desc: 'Widen the franchise, carefully.', outcome: 'The rolls double. Both sides call it a betrayal, which suggests a fair bargain.',
        effects: [{ target: 'dockworkers', delta: 6 }, { target: 'merchants', delta: -4 }, { target: 'stability', delta: 2 }, { target: 'liberty', delta: 6 }] },
      { title: 'Reject the petition', desc: 'The constitution stands.', outcome: 'The petition is filed in the archive. Its signers remember.',
        effects: [{ target: 'dockworkers', delta: -14 }, { target: 'merchants', delta: 8 }, { target: 'clergy', delta: 6 }, { target: 'stability', delta: -4 }, { target: 'liberty', delta: -10 }, { target: 'reform', delta: -6 }] },
    ],
  },
  {
    id: 'canal', title: 'The great canal', category: 'Works',
    body: 'Engineers propose a canal joining the river to the sea. It would take years and an army of labourers, and change the nation’s trade for good.',
    voices: [
      { faction: 'merchants', name: 'Chief engineer', quote: 'Every barge on that canal is forty wagons that never needed a road.' },
      { faction: 'settlers', name: 'Valley farmer', quote: 'It runs through my orchard. Nobody has asked me what an orchard is worth.' },
    ],
    choices: [
      { title: 'Build it with state money', desc: 'A public work, publicly owned.', outcome: 'The first spade goes in to the sound of a brass band.',
        effects: [{ target: 'treasury', delta: -110 }, { target: 'population', delta: 2 }, { target: 'dockworkers', delta: 10 }, { target: 'stability', delta: 3 }, { target: 'market', delta: -8 }, { target: 'reform', delta: 6 }] },
      { title: 'Sell the rights to a company', desc: 'Private money, private tolls.', outcome: 'A canal company is chartered. Its shares treble in a month.',
        effects: [{ target: 'treasury', delta: 70 }, { target: 'merchants', delta: 12 }, { target: 'settlers', delta: -8 }, { target: 'market', delta: 10 }] },
      { title: 'Shelve the plan', desc: 'The orchards stay.', outcome: 'The drawings go into a drawer. Wagons keep to the old road.',
        effects: [{ target: 'settlers', delta: 6 }, { target: 'merchants', delta: -6 }, { target: 'reform', delta: -6 }] },
    ],
  },
  {
    id: 'envoy-insult', title: 'An insult at the banquet', category: 'Diplomacy',
    body: 'At a state banquet, a visiting ambassador loudly mocked your nation’s founding. The room is waiting to see what you do.',
    voices: [
      { faction: 'clergy', name: 'Master of ceremonies', quote: 'Honour ignored is honour surrendered.' },
      { faction: 'merchants', name: 'Trade commissioner', quote: 'Their markets are worth more than their manners.' },
    ],
    choices: [
      { title: 'Expel the ambassador', desc: 'Escort to the border by morning.', outcome: 'The ambassador leaves under guard. The crowd cheers; the trade office winces.',
        effects: [{ target: 'stability', delta: 4 }, { target: 'clergy', delta: 6 }, { target: 'relations', delta: -8 }, { target: 'openness', delta: -8 }] },
      { title: 'Answer with a better joke', desc: 'Win the room instead.', outcome: 'Your reply is quoted in every capital for a month.',
        effects: [{ target: 'influence', delta: 8 }, { target: 'relations', delta: 2 }, { target: 'openness', delta: 4 }] },
      { title: 'Let it pass', desc: 'Dinner continues.', outcome: 'The moment passes. Some at home wish it had not.',
        effects: [{ target: 'relations', delta: 3 }, { target: 'clergy', delta: -6 }, { target: 'stability', delta: -2 }] },
    ],
  },
  // ---- Schooling, health and workers: these move standing policies that act every turn ----
  {
    id: 'university', title: 'A university for the capital', category: 'Education',
    body: 'Scholars ask for a charter and a budget to found the nation’s first university. The Clergy already run every school there is, and the generals have other plans for the money.',
    voices: [
      { faction: 'clergy', name: 'Dean of the seminary', quote: 'We have taught this nation its letters for three centuries. What exactly is broken?' },
      { faction: 'settlers', name: 'Surveyor', quote: 'I had to go abroad to learn to build a bridge. My daughter should not have to.' },
    ],
    choices: [
      { title: 'Found the university', desc: 'A state charter and a state budget.', outcome: 'The first lectures are held in a borrowed warehouse. Within a year there is a waiting list.',
        effects: [{ target: 'education', delta: 1 }, { target: 'treasury', delta: -60 }, { target: 'clergy', delta: -6 }, { target: 'reform', delta: 6 }] },
      { title: 'Leave teaching to the Clergy', desc: 'It has worked so far.', outcome: 'The seminaries carry on as before. The scholars take ship for somewhere that wants them.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'clergy', delta: 10 }, { target: 'stability', delta: 2 }, { target: 'reform', delta: -8 }] },
      { title: 'Close village schools to fund the army', desc: 'Soldiers first, scholars later.', outcome: 'The schoolhouses are boarded up. The children go back to the fields.',
        effects: [{ target: 'military', delta: 1 }, { target: 'education', delta: -1 }, { target: 'treasury', delta: 70 }, { target: 'settlers', delta: -8 }, { target: 'liberty', delta: -4 }] },
    ],
  },
  {
    id: 'child-labour', title: 'Children in the mills', category: 'Labour',
    body: 'A factory inspector reports children of eight working twelve-hour shifts at the looms. Mill owners say families need the wages. Reformers say the nation is spending its future.',
    voices: [
      { faction: 'merchants', name: 'Mill owner', quote: 'Small hands, small wages, and a family that eats. Who exactly is harmed?' },
      { faction: 'dockworkers', name: 'Weaver', quote: 'I was at that loom at nine. I cannot read the notice that says my rent has gone up.' },
    ],
    choices: [
      { title: 'Ban it, and send them to school', desc: 'No child under twelve may work.', outcome: 'The looms run slower. The classrooms are suddenly full.',
        effects: [{ target: 'education', delta: 1 }, { target: 'welfare', delta: 1 }, { target: 'merchants', delta: -12 }, { target: 'dockworkers', delta: 8 }, { target: 'reform', delta: 6 }] },
      { title: 'Limit their hours', desc: 'Half days, and no night work.', outcome: 'A compromise that pleases nobody and helps a little.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'merchants', delta: -5 }, { target: 'dockworkers', delta: 4 }] },
      { title: 'Leave it to the families', desc: 'The state has no place in it.', outcome: 'The inspector’s report is filed. The looms keep their small hands.',
        effects: [{ target: 'education', delta: -1 }, { target: 'merchants', delta: 8 }, { target: 'dockworkers', delta: -8 }, { target: 'market', delta: 6 }] },
    ],
  },
  {
    id: 'teachers-strike', title: 'The teachers walk out', category: 'Education',
    body: 'Schoolteachers across the country have closed their classrooms over pay that has not risen in a decade. Parents are furious, though not all at the same people.',
    voices: [
      { faction: 'settlers', name: 'Village teacher', quote: 'I teach forty children in a barn and mend shoes at night to eat.' },
      { faction: 'clergy', name: 'Parish priest', quote: 'Our brothers will teach for nothing but their supper. Send the strikers home.' },
    ],
    choices: [
      { title: 'Raise their pay', desc: 'Teaching becomes a profession worth having.', outcome: 'The schools reopen. Better candidates start applying.',
        effects: [{ target: 'education', delta: 1 }, { target: 'treasury', delta: -50 }, { target: 'settlers', delta: 6 }] },
      { title: 'Replace them with the Clergy', desc: 'Cheap, willing, and already literate.', outcome: 'The brothers take over the classrooms. The syllabus gets shorter.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'education', delta: -1 }, { target: 'clergy', delta: 10 }, { target: 'settlers', delta: -6 }, { target: 'reform', delta: -6 }] },
      { title: 'Wait them out', desc: 'They will tire before the treasury does.', outcome: 'After two months the teachers return, fewer than left.',
        effects: [{ target: 'education', delta: -1 }, { target: 'treasury', delta: 20 }, { target: 'stability', delta: -3 }] },
    ],
  },
  {
    id: 'country-doctors', title: 'Doctors for the countryside', category: 'Health',
    body: 'Outside the cities there is one doctor for every twenty villages. A plan on your desk would put a state clinic in every district. It is expensive, and the private physicians are against it.',
    voices: [
      { faction: 'settlers', name: 'Midwife', quote: 'I lose mothers to things a city doctor would cure before lunch.' },
      { faction: 'merchants', name: 'Society physician', quote: 'Medicine for nothing is worth what you pay for it.' },
    ],
    choices: [
      { title: 'A state clinic in every district', desc: 'Paid for from the treasury.', outcome: 'Young doctors ride out with state bags. The burial registers grow thinner.',
        effects: [{ target: 'health', delta: 1 }, { target: 'treasury', delta: -60 }, { target: 'settlers', delta: 8 }, { target: 'market', delta: -6 }] },
      { title: 'License private doctors instead', desc: 'Let the profession expand itself.', outcome: 'New practices open, in the towns that can pay for them.',
        effects: [{ target: 'merchants', delta: 6 }, { target: 'settlers', delta: -4 }, { target: 'market', delta: 6 }] },
      { title: 'Cut the health budget to pay debts', desc: 'The books must balance.', outcome: 'Two city hospitals close their charity wards.',
        effects: [{ target: 'health', delta: -1 }, { target: 'treasury', delta: 70 }, { target: 'dockworkers', delta: -8 }] },
    ],
  },
  {
    id: 'bad-water', title: 'Bad water in the tenements', category: 'Health',
    body: 'The wells in the crowded quarters are fouled, and the summer sickness has come early. Engineers want sewers. Landlords say it is not their concern.',
    voices: [
      { faction: 'dockworkers', name: 'Tenement mother', quote: 'We boil it, we strain it, and still the little ones sicken.' },
      { faction: 'merchants', name: 'Landlord', quote: 'I let rooms. I did not promise them a river.' },
    ],
    choices: [
      { title: 'Build sewers at public cost', desc: 'A great work under the streets.', outcome: 'The streets are dug up for a year. The next summer, the sickness does not come.',
        effects: [{ target: 'health', delta: 1 }, { target: 'treasury', delta: -70 }, { target: 'dockworkers', delta: 8 }, { target: 'reform', delta: 4 }] },
      { title: 'Make the landlords pay', desc: 'Clean water or no rent.', outcome: 'The landlords pay, and raise the rents to cover it.',
        effects: [{ target: 'health', delta: 1 }, { target: 'merchants', delta: -10 }, { target: 'dockworkers', delta: 4 }, { target: 'market', delta: -6 }] },
      { title: 'It will pass with the season', desc: 'It always has.', outcome: 'It passes. It takes a good many people with it.',
        effects: [{ target: 'health', delta: -1 }, { target: 'population', delta: -2 }, { target: 'stability', delta: -3 }] },
    ],
  },
  {
    id: 'pensions', title: 'Old hands, empty pockets', category: 'Labour',
    body: 'Workers too old for the docks and the mills are ending their days begging at the temple gates. A deputy proposes a state pension. Others say that is what families and charity are for.',
    voices: [
      { faction: 'dockworkers', name: 'Retired stevedore', quote: 'Forty years I carried this nation’s cargo. Now I carry a bowl.' },
      { faction: 'clergy', name: 'Almoner', quote: 'We have always fed them. A pension would only teach sons to forget their fathers.' },
    ],
    choices: [
      { title: 'A state pension', desc: 'A small sum for every worker past sixty.', outcome: 'The queues at the temple gates shorten. The budget does not.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'treasury', delta: -40 }, { target: 'dockworkers', delta: 10 }, { target: 'market', delta: -8 }] },
      { title: 'Back the mutual aid societies', desc: 'Workers insure each other, with the state’s blessing.', outcome: 'Friendly societies spring up in every trade.',
        effects: [{ target: 'clergy', delta: 6 }, { target: 'dockworkers', delta: 4 }, { target: 'market', delta: 4 }] },
      { title: 'It is not the state’s business', desc: 'Let them work, or let their families keep them.', outcome: 'Nothing changes, except the mood on the docks.',
        effects: [{ target: 'welfare', delta: -1 }, { target: 'merchants', delta: 6 }, { target: 'dockworkers', delta: -12 }] },
    ],
  },
  {
    id: 'minimum-wage', title: 'A floor under wages', category: 'Labour',
    body: 'The Guild demands a legal minimum wage. Employers warn they will hire fewer hands. Each side has brought an economist, and the economists are not speaking to each other.',
    voices: [
      { faction: 'dockworkers', name: 'Guild secretary', quote: 'A day’s work should buy a day’s bread. We ask for nothing cleverer than that.' },
      { faction: 'merchants', name: 'Factory owner', quote: 'Set the price of labour by law and you will find there is less of it wanted.' },
    ],
    choices: [
      { title: 'Set a minimum wage', desc: 'No one may be paid less.', outcome: 'Pay packets grow. A few workshops quietly let people go.',
        effects: [{ target: 'welfare', delta: 1 }, { target: 'dockworkers', delta: 10 }, { target: 'merchants', delta: -8 }, { target: 'market', delta: -6 }] },
      { title: 'Abolish the old guild wage rules', desc: 'Let every worker strike their own bargain.', outcome: 'Wages fall where they can and rise where they must.',
        effects: [{ target: 'welfare', delta: -1 }, { target: 'merchants', delta: 10 }, { target: 'dockworkers', delta: -12 }, { target: 'market', delta: 8 }] },
      { title: 'Leave wages alone', desc: 'Neither floor nor free-for-all.', outcome: 'Both economists declare victory.',
        effects: [{ target: 'stability', delta: 2 }] },
    ],
  },
  // ---- The press, the temple, the border and the army: more standing policies ----
  {
    id: 'leaked-budget', title: 'The leaked budget', category: 'Press',
    body: 'A newspaper has printed the secret military budget, line by line. The generals call it treason. The editor says the public paid for every line and may read them.',
    voices: [
      { faction: 'settlers', name: 'Chief of staff', quote: 'Our neighbours now know what we can afford. Someone must answer for it.' },
      { faction: 'merchants', name: 'Editor', quote: 'If the budget cannot survive being read, the fault is not with the reader.' },
    ],
    choices: [
      { title: 'Prosecute the editor', desc: 'State secrets are not news.', outcome: 'The editor goes to prison. Other editors take note of what not to print.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 2 }, { target: 'liberty', delta: -6 }] },
      { title: 'Publish every budget from now on', desc: 'Nothing left to leak.', outcome: 'The accounts are read out in the Assembly. Several ministries are embarrassed.',
        effects: [{ target: 'press', delta: 1 }, { target: 'influence', delta: 4 }, { target: 'reform', delta: 4 }] },
      { title: 'Buy the newspaper', desc: 'Quietly, through a friend.', outcome: 'The paper changes hands and changes subject.',
        effects: [{ target: 'treasury', delta: -50 }, { target: 'merchants', delta: 4 }] },
    ],
  },
  {
    id: 'news-wire', title: 'One voice or many', category: 'Press',
    body: 'Telegraph lines now reach every town, and news can cross the country in an hour. Whoever runs the wire decides what the nation hears first.',
    voices: [
      { faction: 'clergy', name: 'Minister of posts', quote: 'A rumour used to die on the road. Now it arrives before the truth has its boots on.' },
      { faction: 'merchants', name: 'Publisher', quote: 'Give me a licence and I will give you ten papers by spring.' },
    ],
    choices: [
      { title: 'A state monopoly', desc: 'One official news service.', outcome: 'The nation receives its news promptly, and all of it agrees.',
        effects: [{ target: 'press', delta: -1 }, { target: 'stability', delta: 3 }, { target: 'liberty', delta: -6 }] },
      { title: 'License private wire services', desc: 'Let them compete.', outcome: 'Three services race each other to every story, and occasionally past it.',
        effects: [{ target: 'press', delta: 1 }, { target: 'merchants', delta: 6 }, { target: 'market', delta: 4 }] },
      { title: 'An independent public trust', desc: 'Funded by the state, run by neither side.', outcome: 'The trust is dull, careful, and believed.',
        effects: [{ target: 'press', delta: 1 }, { target: 'treasury', delta: -40 }, { target: 'influence', delta: 3 }] },
    ],
  },
  {
    id: 'tithe', title: 'The temple tithe', category: 'Faith',
    body: 'The Old Clergy ask that the tithe, a tenth of every harvest, be collected by the state like any other tax. Farmers on the frontier have stopped paying it at all.',
    voices: [
      { faction: 'clergy', name: 'Treasurer of the temple', quote: 'We feed the poor and bury the dead. That is not paid for with good wishes.' },
      { faction: 'settlers', name: 'Frontier farmer', quote: 'I have not seen a priest in four years. I see his collector every autumn.' },
    ],
    choices: [
      { title: 'Make the tithe law', desc: 'The state collects it for the temple.', outcome: 'The tithe barns fill. So do the frontier’s grievances.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'clergy', delta: 12 }, { target: 'settlers', delta: -8 }, { target: 'reform', delta: -6 }] },
      { title: 'Abolish tithes altogether', desc: 'Faith must pay its own way.', outcome: 'The temples close their smaller chapels. The farmers keep their tenth.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'clergy', delta: -14 }, { target: 'settlers', delta: 8 }, { target: 'reform', delta: 8 }] },
      { title: 'Keep it voluntary', desc: 'Those who wish to give, may.', outcome: 'Nothing changes, which satisfies no one in particular.',
        effects: [{ target: 'stability', delta: 1 }] },
    ],
  },
  {
    id: 'civil-marriage', title: 'Who may marry whom', category: 'Faith',
    body: 'Only a temple wedding is recognised in law. Couples of different faiths, or none, are living as strangers in the eyes of the courts, and their children inherit nothing.',
    voices: [
      { faction: 'clergy', name: 'High priestess', quote: 'Marriage is a sacrament. A clerk with a rubber stamp cannot perform one.' },
      { faction: 'merchants', name: 'Notary', quote: 'I am asked weekly to write wills for families the law says do not exist.' },
    ],
    choices: [
      { title: 'Only the temple may marry', desc: 'As it has always been.', outcome: 'The law is reaffirmed. The unrecognised families stay that way.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'clergy', delta: 8 }, { target: 'liberty', delta: -4 }] },
      { title: 'Open a civil registry', desc: 'Marriage becomes a matter for the state.', outcome: 'The registry office has a queue on its first morning.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'clergy', delta: -10 }, { target: 'reform', delta: 6 }, { target: 'liberty', delta: 4 }] },
      { title: 'Recognise both', desc: 'Temple or registry, as the couple chooses.', outcome: 'A compromise the Clergy dislike less than the alternative.',
        effects: [{ target: 'clergy', delta: -3 }, { target: 'stability', delta: 2 }] },
    ],
  },
  {
    id: 'hill-preacher', title: 'A preacher in the hills', category: 'Faith',
    body: 'A wandering preacher is drawing crowds of thousands with a plainer creed than the temple’s. The Old Clergy call it heresy and want it stopped before it spreads.',
    voices: [
      { faction: 'clergy', name: 'Inquisitor', quote: 'One faith has held this nation together. Two will pull it apart.' },
      { faction: 'settlers', name: 'Follower', quote: 'He asks nothing of us but that we listen. When did the temple last do that?' },
    ],
    choices: [
      { title: 'Ban the sect', desc: 'One nation, one faith.', outcome: 'The preacher is arrested. His followers meet at night instead.',
        effects: [{ target: 'religion', delta: 1 }, { target: 'clergy', delta: 10 }, { target: 'settlers', delta: -8 }, { target: 'liberty', delta: -8 }] },
      { title: 'Protect every faith by law', desc: 'The state takes no side in heaven.', outcome: 'The law passes. New chapels of every kind appear.',
        effects: [{ target: 'religion', delta: -1 }, { target: 'clergy', delta: -10 }, { target: 'influence', delta: 4 }, { target: 'liberty', delta: 8 }] },
      { title: 'Leave him be', desc: 'Crowds come and go.', outcome: 'The crowds grow for a season, then find their level.',
        effects: [{ target: 'clergy', delta: -4 }] },
    ],
  },
  {
    id: 'guest-workers', title: 'Hands for the harvest', category: 'Borders',
    body: 'The harvest is heavy and there are not enough hands to bring it in. Workers from across the border would come gladly. Some would like to stay.',
    voices: [
      { faction: 'merchants', name: 'Estate manager', quote: 'Grain rots on the stalk while we argue about who may cut it.' },
      { faction: 'settlers', name: 'Farmhand', quote: 'They will work for half. Next year so will I, or not at all.' },
    ],
    choices: [
      { title: 'Invite them, and let them stay', desc: 'Workers this year, neighbours the next.', outcome: 'The harvest comes in. New families settle at the edge of every village.',
        effects: [{ target: 'immigration', delta: 1 }, { target: 'merchants', delta: 8 }, { target: 'settlers', delta: -4 }, { target: 'openness', delta: 6 }] },
      { title: 'Seasonal permits only', desc: 'Come for the harvest, leave with the frost.', outcome: 'The workers come, are paid, and are seen to the border.',
        effects: [{ target: 'treasury', delta: 20 }, { target: 'merchants', delta: 3 }] },
      { title: 'We will farm with our own', desc: 'Better a thin harvest than a crowded one.', outcome: 'Part of the crop is lost. The villages stay as they were.',
        effects: [{ target: 'immigration', delta: -1 }, { target: 'settlers', delta: 6 }, { target: 'merchants', delta: -6 }, { target: 'openness', delta: -6 }] },
    ],
  },
  {
    id: 'border-towns', title: 'Strangers in the border towns', category: 'Borders',
    body: 'The border towns have doubled in size with newcomers. Rents are up, wages are down, and there has been a brawl outside the labour exchange.',
    voices: [
      { faction: 'dockworkers', name: 'Carter', quote: 'I do not hate them. I just cannot feed my family on what they will work for.' },
      { faction: 'merchants', name: 'Shopkeeper', quote: 'Every one of them buys bread. My till has never been fuller.' },
    ],
    choices: [
      { title: 'Close the crossings', desc: 'No more arrivals until things settle.', outcome: 'The gates are shut. The towns grow quieter, and a little poorer.',
        effects: [{ target: 'immigration', delta: -1 }, { target: 'dockworkers', delta: 8 }, { target: 'merchants', delta: -6 }, { target: 'openness', delta: -8 }] },
      { title: 'Citizenship after five years', desc: 'A path, and a promise.', outcome: 'The newcomers start learning the anthem. Not everyone applauds.',
        effects: [{ target: 'immigration', delta: 1 }, { target: 'dockworkers', delta: -6 }, { target: 'influence', delta: 4 }, { target: 'openness', delta: 8 }] },
      { title: 'Spend on the towns themselves', desc: 'Houses, schools, a second labour exchange.', outcome: 'The building work alone employs half the town.',
        effects: [{ target: 'treasury', delta: -50 }, { target: 'stability', delta: 3 }, { target: 'dockworkers', delta: 4 }] },
    ],
  },
  {
    id: 'exiled-scholars', title: 'Scholars in exile', category: 'Borders',
    body: 'A neighbouring government has closed its universities and driven out its professors. Forty of them are at your border asking for refuge. Their old government is watching what you do.',
    voices: [
      { faction: 'settlers', name: 'Rector', quote: 'Half the textbooks our students use were written by the people in that queue.' },
      { faction: 'clergy', name: 'Foreign secretary', quote: 'Take them in and we take a side in a quarrel that is not ours.' },
    ],
    choices: [
      { title: 'Give them refuge and chairs', desc: 'Our universities will be the richer.', outcome: 'The exiles are teaching within the month. An angry note arrives from abroad.',
        effects: [{ target: 'immigration', delta: 1 }, { target: 'education', delta: 1 }, { target: 'relations', delta: -4 }, { target: 'clergy', delta: -4 }] },
      { title: 'Turn them away', desc: 'It is not our quarrel.', outcome: 'The scholars move on. Another nation gets their lectures.',
        effects: [{ target: 'immigration', delta: -1 }, { target: 'relations', delta: 4 }, { target: 'influence', delta: -4 }] },
      { title: 'Let them pass through', desc: 'Safe conduct to wherever will have them.', outcome: 'They cross your country in a week and are grateful for the road.',
        effects: [{ target: 'influence', delta: 2 }] },
    ],
  },
  {
    id: 'arms-budget', title: 'Guns or butter', category: 'Army',
    body: 'The general staff wants the army’s budget doubled. The schools minister wants it halved and the difference spent on classrooms. Both have brought charts.',
    voices: [
      { faction: 'settlers', name: 'Quartermaster general', quote: 'You cannot teach arithmetic to a conquered people.' },
      { faction: 'merchants', name: 'Schools minister', quote: 'Nor defend a border with soldiers who cannot read a map.' },
    ],
    choices: [
      { title: 'Arm the nation', desc: 'More barracks, more drill, more of everything.', outcome: 'New parade grounds are laid out. The neighbours count them.',
        effects: [{ target: 'military', delta: 1 }, { target: 'treasury', delta: -60 }, { target: 'settlers', delta: 6 }, { target: 'relations', delta: -3 }] },
      { title: 'Cut the army, build schools', desc: 'Fewer soldiers, more pupils.', outcome: 'Two regiments are stood down. Their barracks become a college.',
        effects: [{ target: 'military', delta: -1 }, { target: 'education', delta: 1 }, { target: 'settlers', delta: -8 }] },
      { title: 'Hold both where they are', desc: 'Neither chart wins.', outcome: 'Both ministers leave unhappy, which you take as a sign of balance.',
        effects: [{ target: 'stability', delta: 1 }] },
    ],
  },
  {
    id: 'militia-law', title: 'Every citizen a soldier?', category: 'Army',
    body: 'A deputy proposes disbanding most of the regular army in favour of a militia: every citizen trained, armed and sent home. The officers think it madness.',
    voices: [
      { faction: 'settlers', name: 'Militia colonel', quote: 'A man defends his own valley better than any hired stranger.' },
      { faction: 'clergy', name: 'Career officer', quote: 'War is a trade. You would not ask the citizens to perform their own surgery.' },
    ],
    choices: [
      { title: 'A professional standing army', desc: 'Long service, hard training.', outcome: 'The regiments are enlarged and the militias dissolved.',
        effects: [{ target: 'military', delta: 1 }, { target: 'treasury', delta: -30 }, { target: 'liberty', delta: -4 }] },
      { title: 'A citizen militia', desc: 'Every household keeps a rifle.', outcome: 'Drill is held on village greens. It is cheap, cheerful, and of uncertain quality.',
        effects: [{ target: 'military', delta: -1 }, { target: 'settlers', delta: 6 }, { target: 'liberty', delta: 6 }] },
      { title: 'Keep things as they are', desc: 'Regulars at the core, militia behind.', outcome: 'The proposal dies in committee.',
        effects: [{ target: 'stability', delta: 1 }] },
    ],
  },
  {
    id: 'veterans', title: 'The soldiers come home', category: 'Army', when: 'peace',
    body: 'With the fighting over, thousands of soldiers are still in uniform with nothing to do. Keeping them is costly. Releasing them all at once worries the towns they will return to.',
    voices: [
      { faction: 'settlers', name: 'Veteran sergeant', quote: 'I gave you six years. I would like to know what you mean to give me.' },
      { faction: 'merchants', name: 'Mayor', quote: 'Four hundred men with no work and plenty of practice at fighting. I ask only for warning.' },
    ],
    choices: [
      { title: 'Keep them under arms', desc: 'The peace may not last.', outcome: 'The regiments stay at full strength, at full cost.',
        effects: [{ target: 'military', delta: 1 }, { target: 'treasury', delta: -30 }, { target: 'settlers', delta: 4 }] },
      { title: 'Land grants for every veteran', desc: 'A farm for a rifle.', outcome: 'Old soldiers become new settlers along the frontier.',
        effects: [{ target: 'military', delta: -1 }, { target: 'treasury', delta: -40 }, { target: 'settlers', delta: 10 }, { target: 'population', delta: 1 }] },
      { title: 'Discharge them with thanks', desc: 'A medal and a train ticket.', outcome: 'They go home. Some of them remember the medal less fondly than the pay.',
        effects: [{ target: 'military', delta: -1 }, { target: 'treasury', delta: 30 }, { target: 'settlers', delta: -8 }] },
    ],
  },
  // ---- Tax policy: these move the nation's tax level, which scales what every business and wage pays ----
  {
    id: 'business-levy', title: 'The counting-house levy', category: 'Taxes',
    body: 'The treasury wants a larger share of what the nation’s businesses earn. The Merchant Houses say every coin taken is a coin not spent on a new warehouse.',
    voices: [
      { faction: 'merchants', name: 'Guild treasurer', quote: 'Tax the hen and you will still have eggs. Tax her twice and you will have soup, once.' },
      { faction: 'dockworkers', name: 'Shift foreman', quote: 'They cry poverty from a carriage. Let them pay what the rest of us pay.' },
    ],
    choices: [
      { title: 'Raise taxes on business', desc: 'A higher levy on every shop, mine and mill.', outcome: 'The levy rises. The ledgers are fuller, and the Houses colder.',
        effects: [{ target: 'tax', delta: 1 }, { target: 'merchants', delta: -8 }, { target: 'dockworkers', delta: 5 }, { target: 'market', delta: -6 }] },
      { title: 'Cut them to draw in trade', desc: 'Take less from each, and hope for more of them.', outcome: 'The levy falls. New signs go up along the market streets.',
        effects: [{ target: 'tax', delta: -1 }, { target: 'merchants', delta: 8 }, { target: 'dockworkers', delta: -4 }, { target: 'market', delta: 8 }] },
      { title: 'Keep the rate, hire auditors', desc: 'Collect what is already owed.', outcome: 'The auditors find a good deal that had been overlooked.',
        effects: [{ target: 'treasury', delta: 50 }, { target: 'merchants', delta: -4 }, { target: 'reform', delta: 4 }] },
    ],
  },
  {
    id: 'income-tax', title: 'A tax on every wage', category: 'Taxes',
    body: 'The finance ministry proposes something new: a tax on wages, collected from every worker in the country. Nobody likes it. The question is who should dislike it most.',
    voices: [
      { faction: 'dockworkers', name: 'Union clerk', quote: 'A docker’s wage already goes on rent and bread. Find your money where the money is.' },
      { faction: 'merchants', name: 'Banker', quote: 'Punish success and you will soon have nothing left to tax.' },
    ],
    choices: [
      { title: 'A flat tax on all wages', desc: 'The same share from everyone.', outcome: 'Every pay packet is a little lighter. So is every mood.',
        effects: [{ target: 'tax', delta: 1 }, { target: 'dockworkers', delta: -10 }, { target: 'settlers', delta: -6 }, { target: 'market', delta: 4 }] },
      { title: 'Tax only the highest earners', desc: 'Those with the most pay the most.', outcome: 'The great houses pay, loudly. The taverns approve.',
        effects: [{ target: 'tax', delta: 1 }, { target: 'merchants', delta: -14 }, { target: 'dockworkers', delta: 8 }, { target: 'market', delta: -8 }] },
      { title: 'No new tax', desc: 'Find savings instead.', outcome: 'The ministry is told to do more with less, and does a little less with less.',
        effects: [{ target: 'treasury', delta: -40 }, { target: 'stability', delta: 3 }, { target: 'settlers', delta: 4 }] },
    ],
  },
  {
    id: 'tax-holiday', title: 'A holiday for new ventures', category: 'Taxes',
    body: 'A delegation of merchants asks that new businesses pay nothing for their first years. They promise the country will fill with workshops. The treasury sees a hole in the budget.',
    voices: [
      { faction: 'merchants', name: 'Young trader', quote: 'I can start a business or pay your levy. I cannot yet do both.' },
      { faction: 'clergy', name: 'Almoner', quote: 'The old widow pays her tithe. Why should a new shopkeeper be holier than she is?' },
    ],
    choices: [
      { title: 'Grant the holiday', desc: 'Lower taxes across the board to make room.', outcome: 'The budget tightens. The business registers fill up.',
        effects: [{ target: 'tax', delta: -1 }, { target: 'merchants', delta: 10 }, { target: 'clergy', delta: -4 }, { target: 'market', delta: 8 }] },
      { title: 'Offer it to foreign firms only', desc: 'Lure investment from abroad.', outcome: 'Foreign names appear over new doors. Local traders mutter about it.',
        effects: [{ target: 'treasury', delta: 40 }, { target: 'relations', delta: 4 }, { target: 'merchants', delta: -6 }, { target: 'openness', delta: 8 }] },
      { title: 'Refuse', desc: 'Everyone pays the same.', outcome: 'The delegation leaves disappointed. The widow keeps paying her tithe.',
        effects: [{ target: 'merchants', delta: -6 }, { target: 'clergy', delta: 5 }, { target: 'stability', delta: 2 }] },
    ],
  },
  {
    id: 'tax-revolt', title: 'The collectors are chased out', category: 'Taxes',
    body: 'In three market towns, crowds have run the tax collectors out and burned the rolls. Other towns are watching to see what the capital does.',
    voices: [
      { faction: 'settlers', name: 'Town reeve', quote: 'We paid for roads we never saw. We are done paying for them.' },
      { faction: 'clergy', name: 'Chief magistrate', quote: 'Let three towns refuse today and thirty will refuse by harvest.' },
    ],
    choices: [
      { title: 'Send the collectors back with soldiers', desc: 'The law is the law.', outcome: 'The taxes are collected at bayonet point. Nobody forgets the sight.',
        effects: [{ target: 'treasury', delta: 60 }, { target: 'stability', delta: -6 }, { target: 'settlers', delta: -12 }, { target: 'liberty', delta: -8 }] },
      { title: 'Lower the rates', desc: 'Admit they were too high.', outcome: 'New, lighter rolls are drawn up. The towns pay them, grudgingly.',
        effects: [{ target: 'tax', delta: -1 }, { target: 'stability', delta: 5 }, { target: 'settlers', delta: 8 }] },
      { title: 'Let the towns collect their own', desc: 'They keep a share and send the rest.', outcome: 'The towns collect from their own neighbours, and are thorough about it.',
        effects: [{ target: 'treasury', delta: -30 }, { target: 'settlers', delta: 10 }, { target: 'stability', delta: 3 }, { target: 'liberty', delta: 8 }] },
    ],
  },
];

export const DILEMMA_BY_ID: Record<string, Dilemma> = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));
