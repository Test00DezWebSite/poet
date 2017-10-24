import { Repository, Connection } from "typeorm";

import Event from './orm/events/events';

export class EventService {
  private db: Connection;

  constructor(db: Connection) {
    this.db = db
  }

  get eventRepository(): Repository<Event> {
    return this.db.getRepository(Event)
  }
}