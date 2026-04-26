import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';

@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.page.html',
  styleUrl: './change-password.page.scss',
})
export class ChangePasswordPageComponent {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);

  readonly user = this.session.user;
  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  saving = false;
  message = '';
  error = '';

  submit(): void {
    this.message = '';
    this.error = '';
    if (!this.user) {
      this.error = 'Inicia sesion para cambiar tu contrasena.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.newPassword !== raw.confirmPassword) {
      this.error = 'La nueva contrasena y la confirmacion no coinciden.';
      return;
    }

    this.saving = true;
    this.api
      .changePassword({
        userId: this.user.userId,
        currentPassword: raw.currentPassword,
        newPassword: raw.newPassword,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.message = 'Contrasena actualizada correctamente.';
          this.form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        },
        error: () => {
          this.saving = false;
          this.error = 'No se pudo cambiar la contrasena. Verifica la contrasena actual.';
        },
      });
  }
}
