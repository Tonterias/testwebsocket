import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Observer, Subscription } from 'rxjs';

import { CSRFService } from '../auth/csrf.service';
import { WindowRef } from './window.service';
import { AuthServerProvider } from '../auth/auth-jwt.service';

import * as SockJS from 'sockjs-client';
import * as Stomp from 'webstomp-client';

@Injectable({ providedIn: 'root' })
export class JhiTrackerService {
    stompClient = null;
    stompClientMSJ = null;
    subscriber = null;
    subscriberMSJ = null;
    connection: Promise<any>;
    connectedPromise: any;
    connectedPromiseMSJ: any;
    listener: Observable<any>;
    listenerObserver: Observer<any>;
    listenerObserverMSJ: Observer<any>;
    alreadyConnectedOnce = false;
    private subscription: Subscription;

    constructor(
        private router: Router,
        private authServerProvider: AuthServerProvider,
        private $window: WindowRef,
        // tslint:disable-next-line: no-unused-variable
        private csrfService: CSRFService
    ) {
        this.connection = this.createConnection();
        this.listener = this.createListener();
    }

    connect() {
        if (this.connectedPromise === null) {
            this.connection = this.createConnection();
        }
        // building absolute path so that websocket doesn't fail when deploying with a context path
        const loc = this.$window.nativeWindow.location;
        let url;
        url = '//' + loc.host + loc.pathname + 'websocket/tracker';
        let urlMSJ;
        urlMSJ = '//' + loc.host + loc.pathname + 'websocket/msj';
        const authToken = this.authServerProvider.getToken();
        if (authToken) {
            url += '?access_token=' + authToken;
            urlMSJ += '?access_token=' + authToken;
        }
        const socket = new SockJS(url);
        this.stompClient = Stomp.over(socket);
        const headers = {};
        this.stompClient.connect(
            headers,
            () => {
                this.connectedPromise('success');
                this.connectedPromise = null;
                this.sendActivity();
                if (!this.alreadyConnectedOnce) {
                    this.subscription = this.router.events.subscribe(event => {
                        if (event instanceof NavigationEnd) {
                            this.sendActivity();
                        }
                    });
                    this.alreadyConnectedOnce = true;
                }
            }
        );
        const socketMSJ = new SockJS(urlMSJ);
        this.stompClientMSJ = Stomp.over(socketMSJ);
        this.stompClientMSJ.connect(
            headers,
            () => {
                this.connectedPromiseMSJ('success');
                this.connectedPromiseMSJ = null;
                this.sendMensaje();
                /* if (!this.alreadyConnectedOnce) {
                    this.subscription = this.router.events.subscribe(event => {
                        if (event instanceof NavigationEnd) {
                            this.sendMensaje();
                        }
                    });
                    this.alreadyConnectedOnce = true;
                } */
            }
        );
    }

    disconnect() {
        if (this.stompClient !== null) {
            this.stompClient.disconnect();
            this.stompClient = null;
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
        this.alreadyConnectedOnce = false;
    }

    receive() {
        return this.listener;
    }

    sendActivity() {
        if (this.stompClient !== null && this.stompClient.connected) {
            this.stompClient.send(
                '/topic/activity', // destination
                JSON.stringify({ page: this.router.routerState.snapshot.url }), // body
                {} // header
            );
            console.log('ACTIVITY1', this.router.routerState.snapshot.url);
        }
    }

    // --
    sendMensaje() {
        if (this.stompClientMSJ !== null && this.stompClientMSJ.connected) {
            this.stompClientMSJ.send(
                '/msj', // destination
                JSON.stringify({ page: 'mensaje' }), // body
                {} // header
            );
            console.log('ACTIVITY2', this.router.routerState.snapshot.url);
        } else {
            console.log('ACTIVITY ELSE', this.stompClientMSJ, this.stompClientMSJ.connected);
        }
    }
    // ---

    subscribe() {
        this.connection.then(() => {
            this.subscriber = this.stompClient.subscribe('/topic/tracker', data => {
                console.log('DATA1: ', data);
                this.listenerObserver.next(JSON.parse(data.body));
            });
            this.subscriberMSJ = this.stompClientMSJ.subscribe('/topic/msj', data => {
                console.log('DATA2: ', data);
                this.listenerObserver.next(JSON.parse(data.body));
            });
        });
    }

    unsubscribe() {
        if (this.subscriber !== null) {
            this.subscriber.unsubscribe();
        }
        this.listener = this.createListener();
    }

    private createListener(): Observable<any> {
        return new Observable(observer => {
            this.listenerObserver = observer;
            this.listenerObserverMSJ = observer;
        });
    }

    private createConnection(): Promise<any> {
        return new Promise((resolve, reject) => (this.connectedPromise = resolve));
    }
}
