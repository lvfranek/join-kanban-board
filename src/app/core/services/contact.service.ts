import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';


export interface ContactRecord {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
  isSelf?: boolean;
}

export interface ContactInput {
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string;
}

const GUEST_SEED: ContactRecord[] = [
  {
    id: 'guest-1',
    first_name: 'Bruce',
    last_name: 'Wayne',
    email: 'definitely.not.batman@wayne-enterprises.com',
    phone: '+49 151 00000001',
  },
  {
    id: 'guest-2',
    first_name: 'Tony',
    last_name: 'Stark',
    email: 'iam@ironman.com',
    phone: '+49 160 31415926',
  },
  {
    id: 'guest-3',
    first_name: 'Hermione',
    last_name: 'Granger',
    email: 'hermione@hogwarts.edu',
    phone: '+49 176 90909090',
  },
  {
    id: 'guest-4',
    first_name: 'Walter',
    last_name: 'White',
    email: 'heisenberg@chemistry.com',
    phone: '+49 157 50550505',
  },
  {
    id: 'guest-5',
    first_name: 'Leslie',
    last_name: 'Knope',
    email: 'leslie.knope@pawnee.gov',
    phone: '+49 152 42424242',
  },
  {
    id: 'guest-6',
    first_name: 'Sherlock',
    last_name: 'Holmes',
    email: 'sherlock@221b.co.uk',
    phone: '+49 159 22122122',
  },
  {
    id: 'guest-7',
    first_name: 'Lara',
    last_name: 'Croft',
    email: 'lara@tombraider.com',
    phone: '+49 163 19961996',
  },
  {
    id: 'guest-8',
    first_name: 'Princess',
    last_name: 'Leia',
    email: 'leia@rebellion.org',
    phone: '+49 173 49774977',
  },
];

type ContactResponse = Omit<ContactRecord, 'id'> & { id: number };

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/contacts/`;

  private readonly contactsState = signal<ContactRecord[]>([]);
  private readonly loadedState = signal(false);
  private inflight: Promise<ContactRecord[]> | null = null;

  /** Synthetic contact representing the currently authenticated user. */
  private readonly selfContact = computed<ContactRecord | null>(() => {
    const user = this.auth.currentUser();
    if (!user) return null;
    const parts = (user.name || user.email).trim().split(/\s+/).filter(Boolean);
    const [first, ...rest] = parts;
    return {
      id: `self:${user.id}`,
      first_name: first || user.email,
      last_name: rest.length ? rest.join(' ') : null,
      email: user.email,
      phone: user.phone ?? '',
      isSelf: true,
    };
  });

  /** Combined list: persisted contacts + self-contact (sorted alphabetically). */
  readonly contacts = computed<ContactRecord[]>(() => {
    const list = this.contactsState();
    const self = this.selfContact();
    const combined = self ? [self, ...list] : list;
    return [...combined].sort((a, b) => a.first_name.localeCompare(b.first_name));
  });
  readonly isLoaded = computed(() => this.loadedState());

  constructor() {
    this.auth.onLogout(() => this.invalidate());
  }

  async list(forceReload = false): Promise<ContactRecord[]> {
    if (this.auth.isGuest()) {
      if (!this.loadedState()) {
        this.contactsState.set([...GUEST_SEED]);
        this.loadedState.set(true);
      }
      return this.contacts();
    }

    if (!forceReload && this.loadedState()) {
      return this.contacts();
    }

    if (this.inflight) {
      await this.inflight;
      return this.contacts();
    }

    this.inflight = (async () => {
      try {
        let records = await this.fetchAll();

        // Seed initial demo contacts on first login so registered users
        // see the same starter data as guests do.
        if (records.length === 0) {
          records = await this.seedInitialContacts();
        }

        this.contactsState.set(records);
        this.loadedState.set(true);
        return records;
      } finally {
        this.inflight = null;
      }
    })();

    await this.inflight;
    return this.contacts();
  }

  async create(contact: ContactInput): Promise<ContactRecord> {
    if (this.auth.isGuest()) {
      const record: ContactRecord = { id: this.generateLocalId(), ...contact };
      this.contactsState.update((list) =>
        [...list, record].sort((a, b) => a.first_name.localeCompare(b.first_name)),
      );
      return record;
    }

    const data = await firstValueFrom(this.http.post<ContactResponse>(this.baseUrl, contact));
    const record = this.toRecord(data);
    this.contactsState.update((list) =>
      [...list, record].sort((a, b) => a.first_name.localeCompare(b.first_name)),
    );
    return record;
  }

  async update(id: string, patch: Partial<ContactInput>): Promise<ContactRecord> {
    if (id.startsWith('self:')) {
      return this.updateSelf(patch);
    }

    if (this.auth.isGuest()) {
      let updated: ContactRecord | null = null;
      this.contactsState.update((list) =>
        list.map((entry) => {
          if (entry.id !== id) return entry;
          updated = { ...entry, ...patch };
          return updated;
        }),
      );
      if (!updated) throw new Error('Contact not found');
      return updated;
    }

    const data = await firstValueFrom(
      this.http.patch<ContactResponse>(`${this.baseUrl}${id}/`, patch),
    );
    const record = this.toRecord(data);
    this.contactsState.update((list) => list.map((entry) => (entry.id === id ? record : entry)));
    return record;
  }

  async remove(id: string): Promise<void> {
    if (id.startsWith('self:')) {
      throw new Error('You cannot delete your own account from the contacts list.');
    }

    if (this.auth.isGuest()) {
      this.contactsState.update((list) => list.filter((entry) => entry.id !== id));
      return;
    }

    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}${id}/`));
    this.contactsState.update((list) => list.filter((entry) => entry.id !== id));
  }

  invalidate(): void {
    this.loadedState.set(false);
    this.contactsState.set([]);
  }

  private async updateSelf(patch: Partial<ContactInput>): Promise<ContactRecord> {
    const current = this.auth.currentUser();
    if (!current) {
      throw new Error('No authenticated user');
    }

    const newFirst = patch.first_name ?? '';
    const newLast = patch.last_name ?? null;
    const fullName =
      [newFirst, newLast].filter(Boolean).join(' ').trim() || patch.first_name || current.name;

    // Only updates the local state for now; there is no profile endpoint in Django yet.
    this.auth.updateCurrentUser({
      name: fullName,
      email: patch.email ?? current.email,
      phone: patch.phone ?? current.phone,
    });

    return this.selfContact()!;
  }

  private async fetchAll(): Promise<ContactRecord[]> {
    const data = await firstValueFrom(this.http.get<ContactResponse[]>(this.baseUrl));
    return data.map((contact) => this.toRecord(contact));
  }

  private async seedInitialContacts(): Promise<ContactRecord[]> {
    try {
      const created = await Promise.all(
        GUEST_SEED.map(({ id: _omit, ...rest }) =>
          firstValueFrom(this.http.post<ContactResponse>(this.baseUrl, rest)),
        ),
      );
      return created
        .map((contact) => this.toRecord(contact))
        .sort((a, b) => a.first_name.localeCompare(b.first_name));
    } catch (err) {
      console.warn('Could not seed initial contacts', err);
      return [...GUEST_SEED];
    }
  }

  private toRecord(data: ContactResponse): ContactRecord {
    return { ...data, id: String(data.id) };
  }

  private generateLocalId(): string {
    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
