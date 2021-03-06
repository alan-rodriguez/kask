import {SocketService} from './sockets.service';
import { Tap } from '../models';
import { Pour } from '../models/pour.model';
import { TapSession } from '../models/session.model';
import { Injectable } from '@angular/core';
import { Http, Response } from '@angular/http';
import { Observable, ReplaySubject, Subject } from 'rxjs/Rx';


@Injectable()
export class TapService {

    private tapContents: {[key: number]: Subject<TapSession>} = {};
    private tapPours: {[key: number]: Subject<Pour>} = {};
    private tapInfo: {[key: number]: Subject<Tap>} = {};


    constructor(
        private http: Http,
        private sockets: SocketService
    ) {
        sockets.onRoot('TapContentsEvent', (contents) => {
                this.getSubject(this.tapContents, contents.TapId).next(contents.Contents);
            }
        );

        sockets.onRoot('PourEvent', (pourEvent) => {
                this.getSubject(this.tapPours, pourEvent.tapId).next(pourEvent);
            }
        );

        sockets.onRoot('TapInfoEvent', (info) => {
            this.getSubject(this.tapInfo, info.TapId).next(info);
        });
    }

    addTap(data): Observable<number> {
        return this.http.post('/api/admin/taps', data)
        .map(res => res.json())
        .map(res => res.TapId);
    }

    updateTap(data): Observable<boolean> {
        return this.http.patch('/api/admin/taps', data)
        .map(res => res.json())
        .map(res => res.Success);
    }

    vote(tapId: number, isUpVote: string): Observable<Response> {
        return this.http.post(`/api/votes/tap/${tapId}`, {Vote: isUpVote});
    }

    deleteTap(tapid): Observable<boolean> {
        return this.http.delete(`/api/admin/taps/${tapid}`)
        .map(res => res.json())
        .map(res => res.Success);
    }

    getTaps(): Observable<Tap[]> {
        return this.http.get('/api/beers/taps')
        .map(res => res.json())
        .do(taps => taps.forEach(tap => this.getSubject(this.tapInfo, tap.TapId).next(tap)));
    }

    getTap(tapId: number): Observable<Tap[]> {
        return this.http.get(`/api/beers/tap/${tapId}`)
        .map(res => res.json())
        .do(tap => this.tapInfo[tap.TapId].next(tap));
    }

    observeTapContents(tapId: number): Observable<TapSession> {
        return this.getSubject(this.tapContents, tapId)
    }

    getTapContents(tapId: number): Observable<TapSession> {
        return this.http.get(`/api/beers/contents/tap/${tapId}`)
        .map(res => res.json())
        .do(_ => this.getSubject(this.tapContents, tapId).next(_));
    }

    observeTapPours(tapId: number): Observable<Pour> {
         return this.getSubject(this.tapPours, tapId);
    }

    observeTapInfo(tapId: number): Observable<Tap> {
        return this.getSubject(this.tapInfo, tapId);
    }

    private getSubject<T>(collection: {[key: number]: Subject<T>}, id: any): Subject<T> {
        if (!collection[id]) {
            collection[id] = new ReplaySubject<T>(1);
        }
        return collection[id];
    }
}
