// Import stylesheets
import './style.scss';
import {fromEvent,defer, from,combineLatest, merge} from 'rxjs';
import {mergeAll, tap, filter, mapTo,map,distinctUntilKeyChanged, scan, startWith, distinctUntilChanged } from 'rxjs/operators';
import {data as operatorData} from './operator-data'
import {ShuffleCards} from './d3-table-cards';

// console.clear();

const data = operatorData;

const orderElem = document.getElementById('order');
renderSortButtons(orderElem, Object.keys(operatorData[0]));

const layoutConfig =  {
    table: {
      // ---- row position & size
      top: (d, i) => 40+i*29+'px',
      left: 0+'px',
      height: 28+'px',
      width: 590+'px',
    },
    cards: {
      // ---- card position & size
      top: (d, i) => Math.floor(i/getCardsPerRow()) * 90 + 'px',
      left: (d, i) => (i%getCardsPerRow()) * 200 + 'px',
      height: 80+'px',
      width: 188+'px'
    }
  };
const shuffleCards = new ShuffleCards(operatorData, layoutConfig);

// ==========================================================================

const layoutTableBtn = document.getElementById('table');
const layoutCardBtn = document.getElementById('cards');

const windowResize$ = fromEvent(window, 'resize');
const layoutTable$ = fromEvent(layoutTableBtn, 'click');
const layoutCard$ = fromEvent(layoutCardBtn, 'click');

let currentLayout = 'cards';

shuffleCards.render(currentLayout);

// =============

const state$ = merge(
  layoutCard$.pipe(mapTo({layout: 'cards'})),
  layoutTable$.pipe(mapTo({layout: 'table'})),
  defer(getObservableFromFilterbuttons)
    .pipe(
      mergeAll(),
      map(o => ({sortKey: o.target.id.split('-').pop()}))
    )
).pipe(
  startWith({
    layout: 'cards',
    sortKey: 'id',
    sortDirection: 1
  }),
  scan((state, command) => {
    command.sortDirection = (command.sortKey && command.sortKey === state.sortKey) ? -state.sortDirection : 1;
    return {...state, ...command};
  })
);

const layout$ = state$.pipe(
  map(s => s['layout']),
  distinctUntilChanged()
);
const sortKey$ = state$.pipe(
  map(s => s['sortKey']),
  distinctUntilChanged()
);
const sortDirection$ = state$.pipe(
  map(s => s['sortDirection']),
  distinctUntilChanged()
);

merge(
  combineLatest(sortKey$, windowResize$)
    .pipe(tap(([s, w]) => shuffleCards.layout(currentLayout, getItemClassFactory(s)))),
  layout$
    .pipe(tap(layout => shuffleCards.layout(layout))),
  combineLatest(sortKey$, sortDirection$, layout$)
    .pipe(
        tap(([s, d, l]) => {
          shuffleCards.sort(s, d);
          shuffleCards.layout(l, getItemClassFactory(s), false, true);
        })
      )
)
.subscribe();

// ========================================================================

function getItemClassFactory(sortKey) {
  return (d) => {
   // console.log('group-' + d[sortKey]);
    return 'item group-' + d[sortKey]
  }
}

function renderSortButtons(parent: HTMLElement, keys: string[]) {
  parent.innerHTML = keys
    .map(k => {
      return `<button class="sort" id="sort-${k}">${k}</button>`
    })
    .join('');
}

function getObservableFromFilterbuttons() {
  const obs = [];
  document.querySelectorAll('.sort').forEach((elem) => {
    obs.push(fromEvent(elem, 'click'))
  });
  return from(obs);
}

function getCardsPerRow(): number {
  const width = window.innerWidth - 20;
  return Math.floor(width / 200);
}
