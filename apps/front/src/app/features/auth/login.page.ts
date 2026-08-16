import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { TordoBrandingComponent, TordoAboutComponent, TordoBrandingService } from '@tordo/frontend';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TordoBrandingComponent, TordoAboutComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPageComponent {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly branding = inject(TordoBrandingService);

  readonly form = new FormBuilder().nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  message = '';
  isSubmitting = false;
  showAbout = false;

  submit(): void {
    if (this.isSubmitting) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.message = '';
    this.isSubmitting = true;
    this.api.login(this.form.getRawValue()).subscribe({
      next: ({ data }) => {
        this.session.setUser(data);
        // Enviar HTML de la pantalla a Tordo API para registro de branding
        this.branding.registerOnLogin();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && this.session.canAccessRoute(returnUrl)) {
          this.router.navigateByUrl(returnUrl);
          return;
        }
        this.router.navigateByUrl(this.session.defaultRouteByRole());
      },
      error: () => {
        this.message = 'No se pudo iniciar sesión. Verifica correo, contraseña y estado del usuario.';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }
}
