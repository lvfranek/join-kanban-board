import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  ContactInput,
  ContactRecord,
  ContactService,
} from '../../../core/services/contact.service';

type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  colorClass: string;
  isSelf?: boolean;
};

type ContactGroup = {
  letter: string;
  contacts: Contact[];
};

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class Contacts implements OnInit {
  private readonly contactService = inject(ContactService);
  selectedContactId = signal<string | null>(null);
  isDialogOpen = signal(false);
  isDialogClosing = signal(false);
  isMobileActionsOpen = signal(false);
  dialogMode = signal<'create' | 'edit'>('create');
  editingContactId = signal<string | null>(null);
  isSuccessToastOpen = signal(false);
  isSuccessToastClosing = signal(false);
  newContactName = signal('');
  newContactEmail = signal('');
  newContactPhone = signal('');
  nameError = signal('');
  emailError = signal('');
  phoneError = signal('');
  dialogAvatarInitials = computed(() => this.getInitials(this.newContactName()));

  private dialogAnimationDuration = 400;
  private toastVisibleDuration = 2500;
  private toastAnimationDuration = 400;
  private toastHideTimer: ReturnType<typeof setTimeout> | null = null;
  private toastCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  private avatarColorClasses = [
    'avatar--orange',
    'avatar--purple',
    'avatar--violet',
    'avatar--pink',
    'avatar--yellow',
    'avatar--turquoise',
    'avatar--dark-purple',
    'avatar--red',
  ];

  contacts = computed<Contact[]>(() =>
    this.contactService
      .contacts()
      .map((record) => this.toContact(record))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  contactGroups = computed<ContactGroup[]>(() => this.groupContacts(this.contacts()));

  selectedContact = computed<Contact | null>(
    () => this.contacts().find((c) => c.id === this.selectedContactId()) ?? null,
  );

  constructor() {
    effect(() => {
      const id = this.selectedContactId();
      if (!id) {
        return;
      }

      const stillExists = this.contacts().some((c) => c.id === id);
      if (!stillExists) {
        this.selectedContactId.set(null);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.contactService.list();
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  }

  private toContact(record: ContactRecord): Contact {
    const fullName = [record.first_name, record.last_name].filter(Boolean).join(' ').trim();
    return {
      id: record.id,
      name: fullName,
      email: record.email,
      phone: record.phone,
      colorClass: this.getColorClassFor(record.id),
      isSelf: record.isSelf,
    };
  }

  private getColorClassFor(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    const index = Math.abs(hash) % this.avatarColorClasses.length;
    return this.avatarColorClasses[index];
  }

  private splitName(fullName: string): { first_name: string; last_name: string | null } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const [first, ...rest] = parts;
    return {
      first_name: first ?? '',
      last_name: rest.length ? rest.join(' ') : null,
    };
  }

  selectContact(contact: Contact): void {
    this.isMobileActionsOpen.set(false);

    if (this.selectedContactId() === contact.id) {
      this.selectedContactId.set(null);
      return;
    }

    this.selectedContactId.set(contact.id);
  }

  closeContactDetail(): void {
    this.selectedContactId.set(null);
    this.isMobileActionsOpen.set(false);
  }

  toggleMobileActions(): void {
    this.isMobileActionsOpen.update((isOpen) => !isOpen);
  }

  getInitials(name: string): string {
    return name
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getPhoneHref(phone: string): string {
    return `tel:${phone.replace(/\s/g, '')}`;
  }

  private getAvatarColorClass(index: number): string {
    return this.avatarColorClasses[index % this.avatarColorClasses.length];
  }

  private groupContacts(contacts: Contact[]): ContactGroup[] {
    const groups = contacts.reduce<Record<string, Contact[]>>((result, contact) => {
      const firstLetter = contact.name.charAt(0).toUpperCase();

      if (!result[firstLetter]) {
        result[firstLetter] = [];
      }

      result[firstLetter].push(contact);
      return result;
    }, {});

    return Object.entries(groups).map(([letter, groupedContacts]) => ({
      letter,
      contacts: groupedContacts,
    }));
  }

  openDialog(): void {
    this.dialogMode.set('create');
    this.editingContactId.set(null);
    this.resetForm();
    this.isDialogOpen.set(true);
  }

  openEditDialog(): void {
    const current = this.selectedContact();
    if (!current) {
      return;
    }

    this.dialogMode.set('edit');
    this.editingContactId.set(current.id);
    this.newContactName.set(current.name);
    this.newContactEmail.set(current.email);
    this.newContactPhone.set(current.phone);
    this.isDialogOpen.set(true);
  }

  closeDialog(): void {
    this.isDialogClosing.set(true);
    setTimeout(() => {
      this.isDialogOpen.set(false);
      this.isDialogClosing.set(false);
      this.dialogMode.set('create');
      this.editingContactId.set(null);
      this.resetForm();
    }, this.dialogAnimationDuration);
  }

  submitContact(): void {
    this.clearErrors();

    if (!this.validateForm()) {
      return;
    }

    if (this.dialogMode() === 'edit') {
      this.updateContact();
      return;
    }

    this.createContact();
  }

  private validateForm(): boolean {
    let isValid = true;

    // Validate name
    const name = this.newContactName().trim();
    if (!name) {
      this.nameError.set('Name is required');
      isValid = false;
    } else if (!/^\D+$/.test(name)) {
      this.nameError.set('Name cannot contain numbers');
      isValid = false;
    } else if (!this.hasFirstAndLastName(name)) {
      this.nameError.set('Name must contain first and last name');
      isValid = false;
    }

    // Validate email
    const email = this.newContactEmail().trim();
    if (!email) {
      this.emailError.set('Email is required');
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.emailError.set('Please enter a valid email address');
      isValid = false;
    }

    // Validate phone
    const phone = this.newContactPhone().trim();
    if (!phone) {
      this.phoneError.set('Phone is required');
      isValid = false;
    } else if (!this.isValidPhone(phone)) {
      this.phoneError.set('Phone can only contain numbers and an optional + at the beginning');
      isValid = false;
    }

    return isValid;
  }

  private hasFirstAndLastName(name: string): boolean {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length >= 2;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const normalizedPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^\+?\d+$/;
    return phoneRegex.test(normalizedPhone);
  }

  private clearErrors(): void {
    this.nameError.set('');
    this.emailError.set('');
    this.phoneError.set('');
  }

  validateNameOnBlur(): void {
    const name = this.newContactName().trim();
    if (!name) {
      this.nameError.set('Name is required');
    } else if (!/^\D+$/.test(name)) {
      this.nameError.set('Name cannot contain numbers');
    } else if (!this.hasFirstAndLastName(name)) {
      this.nameError.set('Name must contain first and last name');
    } else {
      this.nameError.set('');
    }
  }

  validateEmailOnBlur(): void {
    const email = this.newContactEmail().trim();
    if (!email) {
      this.emailError.set('Email is required');
    } else if (!this.isValidEmail(email)) {
      this.emailError.set('Please enter a valid email address');
    } else {
      this.emailError.set('');
    }
  }

  validatePhoneOnBlur(): void {
    const phone = this.newContactPhone().trim();
    if (!phone) {
      this.phoneError.set('Phone is required');
    } else if (!this.isValidPhone(phone)) {
      this.phoneError.set('Phone can only contain numbers and an optional + at the beginning');
    } else {
      this.phoneError.set('');
    }
  }

  onNameInput(): void {
    if (this.nameError()) {
      this.validateNameOnBlur();
    }
  }

  onEmailInput(): void {
    if (this.emailError()) {
      this.validateEmailOnBlur();
    }
  }

  onPhoneInput(): void {
    if (this.phoneError()) {
      this.validatePhoneOnBlur();
    }
  }

  async createContact(): Promise<void> {
    if (!this.newContactName() || !this.newContactEmail() || !this.newContactPhone()) {
      return;
    }

    const payload: ContactInput = {
      ...this.splitName(this.newContactName()),
      email: this.newContactEmail().trim(),
      phone: this.newContactPhone().trim(),
    };

    try {
      const created = await this.contactService.create(payload);
      this.selectedContactId.set(created.id);

      this.closeDialog();
      setTimeout(() => {
        this.showSuccessToast();
      }, this.dialogAnimationDuration);
    } catch (error) {
      console.error('Failed to create contact', error);
    }
  }

  async deleteSelectedContact(): Promise<void> {
    const id = this.selectedContactId();
    if (!id) {
      return;
    }

    if (this.selectedContact()?.isSelf) {
      // The own profile cannot be removed via the contacts list.
      this.isMobileActionsOpen.set(false);
      return;
    }

    try {
      await this.contactService.remove(id);
      this.selectedContactId.set(null);
      this.isMobileActionsOpen.set(false);
    } catch (error) {
      console.error('Failed to delete contact', error);
    }
  }

  async deleteContact(): Promise<void> {
    const editingContactId = this.editingContactId();

    if (!editingContactId) {
      return;
    }

    try {
      await this.contactService.remove(editingContactId);

      if (this.selectedContactId() === editingContactId) {
        this.selectedContactId.set(null);
      }
      this.closeDialog();
    } catch (error) {
      console.error('Failed to delete contact', error);
    }
  }

  private async updateContact(): Promise<void> {
    const editingContactId = this.editingContactId();

    if (
      !editingContactId ||
      !this.newContactName() ||
      !this.newContactEmail() ||
      !this.newContactPhone()
    ) {
      return;
    }

    const currentContact = this.contacts().find((contact) => contact.id === editingContactId);

    if (!currentContact) {
      return;
    }

    try {
      const updated = await this.contactService.update(editingContactId, {
        ...this.splitName(this.newContactName()),
        email: this.newContactEmail().trim(),
        phone: this.newContactPhone().trim(),
      });
      this.selectedContactId.set(updated.id);
      this.closeDialog();
    } catch (error) {
      console.error('Failed to update contact', error);
    }
  }

  private showSuccessToast(): void {
    if (this.toastHideTimer) {
      clearTimeout(this.toastHideTimer);
    }

    if (this.toastCleanupTimer) {
      clearTimeout(this.toastCleanupTimer);
    }

    this.isSuccessToastClosing.set(false);
    this.isSuccessToastOpen.set(true);

    this.toastHideTimer = setTimeout(() => {
      this.isSuccessToastClosing.set(true);
      this.toastCleanupTimer = setTimeout(() => {
        this.isSuccessToastOpen.set(false);
        this.isSuccessToastClosing.set(false);
        this.toastCleanupTimer = null;
      }, this.toastAnimationDuration);
      this.toastHideTimer = null;
    }, this.toastVisibleDuration);
  }

  private resetForm(): void {
    this.newContactName.set('');
    this.newContactEmail.set('');
    this.newContactPhone.set('');
    this.clearErrors();
  }
}
