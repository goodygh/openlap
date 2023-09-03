import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, ViewChild } from '@angular/core';

import { IonModal, Platform } from '@ionic/angular';

import { Subscription } from 'rxjs';

const FIELDS = [{
  // no fuel/pit lane
  practice: [
    'bestlap gap int avglap laps status',
    'bestlap sector1 sector2 sector3 avglap status'
  ],
  qualifying: [
    'bestlap gap int avglap laps status',
    'bestlap sector1 sector2 sector3 avglap status'
  ],
  race: [
    'time bestlap avglap laps status',
    'time sector1 sector2 sector3 avglap status',
  ]
}, {
  // with fuel/pit lane
  practice: [
    'bestlap gap int avglap laps fuel status',
    'bestlap sector1 sector2 sector3 avglap fuel status'
  ],
  qualifying: [
    'bestlap gap int avglap laps fuel status',
    'bestlap sector1 sector2 sector3 avglap fuel status'
  ],
  race: [
    'time bestlap avglap laps pits fuel status',
    'time sector1 sector2 sector3 avglap fuel status'
  ]
}];

const DETAIL_FIELDS = [
  'lap laptime gap int',
  'lap laptime sector1 sector2 sector3'
];

export class LeaderboardItem {
  id: number;
  driver: { name: string, code: string, color: string };
  position: number;
  time: number;
  laps: number;
  last: number[];
  best: number[];
  avg: number;
  times: number[][];
  fuel?: number;
  pit?: boolean;
  pits?: number;
  sector?: number;
  gridpos?: number;
  refuel?: boolean;
  finished?: boolean;
}

// TODO: merge with LeaderboardItem, i.e. times == laptimes?
class LeaderboardDetail extends LeaderboardItem {
  laptimes: number[][];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'leaderboard',
  styleUrls: ['leaderboard.component.scss'],
  templateUrl: 'leaderboard.component.html'
})
export class LeaderboardComponent implements OnDestroy {

  readonly placeholder = 'Driver {{number}}';
  
  @ViewChild(IonModal) modal: IonModal;

  @Input() mode: 'practice' | 'qualifying' | 'race';

  @Input() sectors: boolean;

  @Input() pitlane: boolean;

  @Input() set items(items: LeaderboardItem[]) {
    this._items = items;
    if (items) {
      this.ranked = [...items];
      this.ranked.sort((lhs, rhs) => lhs.position - rhs.position);
      // TODO: move to rms?
      this.best = items.map(item => item.best).reduce((acc, times) => {
        times.forEach((time, index) => {
          if (time < (acc[index] || Infinity)) {
            acc[index] = time;
          }
        });
        return acc;
      }, []);
    } else {
      this.ranked = items;
      this.best = [];
    }
    // FIXME: sort by id, extend item.times?
    if (this.detail) {
      for (let item of items) {
        if (item.id == this.detail.id) {
          this.detail = Object.assign({}, item, {
            laptimes: this.getLapTimes(item)
          })
          break;
        }
      }
      this.intlaps = this.getIntLaps(items);
    }
  }

  get items() {
    return this._items;
  }

  get fields() {
    const f = FIELDS[this.pitlane ? 1 : 0][this.mode][this.sectors ? 1 : 0];
    return ((this.platform.isPortrait() ? 'code' : 'number name') + ' ' + f).split(/\s+/);
  }

  get detailFields() {
    return DETAIL_FIELDS[this.sectors ? 1 : 0].split(/\s+/);
  }

  public ranked: LeaderboardItem[];

  public best: number[];

  public detail: LeaderboardDetail = null;

  public intlaps: {};

  private _items: LeaderboardItem[];

  private subscription: Subscription;

  constructor(ref: ChangeDetectorRef, private platform: Platform) {
    this.subscription = platform.resize.subscribe(() => ref.markForCheck());
  }

  getLapTimes(item: LeaderboardItem) {
    let laptimes = [];
    for (let i = item.times.length - 2; i >= 0; --i) {
      const row = [item.times[i + 1]?.[0]].concat(item.times[i]);
      laptimes.push(row);
    }
    return laptimes;
  }

  getIntLaps(items: LeaderboardItem[]) {
    let intlaps = {};
    const bestlaps = items.map(item => {
      return [item.id, item.best[0]];
    }).sort((a, b) => {
      return a[1] - b[1];
    });
    bestlaps.map(([id, time], index) => {
      return [id, index ? bestlaps[index - 1][1] : time];
    }).forEach(([id, time]) => {
      intlaps[id] = time;
    });
    return intlaps;
  }

  showDetails(item: LeaderboardItem) {
    this.detail = Object.assign({}, item, {
      laptimes: this.getLapTimes(item)
    });
    this.intlaps = this.getIntLaps(this._items);
  }

  onWillDismissDetails(event) {
    this.detail = null;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
