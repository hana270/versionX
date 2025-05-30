import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
} from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, HttpClientModule, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {
  SocialLoginModule,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';
import { GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { JwtModule } from '@auth0/angular-jwt';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FullCalendarModule } from '@fullcalendar/angular';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { LucideAngularModule, CreditCard, Package2, Users, Wrench, Home, Medal, Calendar, MapPin, CheckCircle, FileText, Hash, Activity, ShoppingCart, Package, ShoppingBag, Tag, BoxSelect, MessageCircle, User, Mail, Send, Smile, Paperclip, UserCog, LoaderCircle } from 'lucide-angular';

import { AppComponent } from './app.component';
import { LoadingComponent } from './features/public/loading/loading.component';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { EditProfileComponent } from './features/admin/edit-profile/edit-profile.component';
import { SendInstallerInvitationComponent } from './features/admin/send-installer-invitation/send-installer-invitation.component';
import { InstallerRegisterComponent } from './features/installer/installer-register/installer-register.component';
import { InstallerHomeComponent } from './features/installer/installer-home/installer-home.component';
import { AddBassinComponent } from './features/admin/bassin/add-bassin/add-bassin.component';
import { UpdateBassinComponent } from './features/admin/bassin/update-bassin/update-bassin.component';
import { DetailsBassinComponent } from './features/admin/bassin/details-bassin/details-bassin.component';
import { ListCategoriesComponent } from './features/admin/Categorie/list-categories/list-categories.component';
import { AddCategorieComponent } from './features/admin/Categorie/add-categorie/add-categorie.component';
import { UpdateCategorieComponent } from './features/admin/Categorie/update-categorie/update-categorie.component';
import { HomePageComponent } from './features/public/home-page/home-page.component';
import { ShopPageComponent } from './features/public/shop-page/shop-page.component';
import { BassinComponent } from './features/admin/bassin/bassin/bassin.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { LayoutComponent } from './features/admin/layout/layout.component';
import { UsersListComponent } from './features/admin/users-list/users-list.component';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginComponent } from './features/public/login/login.component';
import { RegisterComponent } from './features/public/register/register.component';
import { VerifEmailComponent } from './features/public/verif-email/verif-email.component';
import { ResetPasswordComponent } from './features/public/reset-password/reset-password.component';
import { RequestResetPasswordComponent } from './features/public/request-reset-password/request-reset-password.component';
import { ValidateCodeComponent } from './features/public/validate-code/validate-code.component';
import { GithubToCdnPipe } from './pipes/github-to-cdn.pipe';
import { ArViewerComponent } from './features/admin/bassin/realite-augmenter/ar-viewer/ar-viewer.component';
import { BassinDetailComponent } from './features/public/bassin-detail/bassin-detail.component';
import { BassinPersonnaliseComponent } from './features/admin/bassin/bassin-personnalise/bassin-personnalise.component';
import { BassinPersonnaliseDetailsComponent } from './features/admin/bassin/bassin-personnalise-details/bassin-personnalise-details.component';
import { BassinPersonnaliseUpdateComponent } from './features/admin/bassin/bassin-personnalise-update/bassin-personnalise-update.component';
import { BassinPersonnaliseClientComponent } from './features/admin/bassin/bassin-personnalise-client/bassin-personnalise-client.component';
import { BassinPersonnaliseArdetailComponent } from './features/admin/bassin/bassin-personnalise-ardetail/bassin-personnalise-ardetail.component';
import { CommonModule, DatePipe } from '@angular/common';
import { EditPromotionComponent } from './features/admin/promotion/edit-promotion/edit-promotion.component';
import { PromotionsListComponent } from './features/admin/promotion/promotions-list/promotions-list.component';
import { NotificationsComponent } from './features/admin/notifications/notifications.component';
import { StocksListComponent } from './features/admin/stocks/stocks-list/stocks-list.component';
import { StockActionDialogComponent } from './features/admin/stocks/stock-action-dialog/stock-action-dialog.component';
import { HeaderComponent } from './features/public/header/header.component';
import { FooterComponent } from './features/public/footer/footer.component';
import { CartComponent } from './features/public/cart/cart.component';
import { FavoritesPageComponent } from './features/public/favorites-page/favorites-page.component';
import { AvisComponent } from './features/admin/avis/avis.component';
import { AddPromotionComponent } from './features/admin/promotion/add-promotion/add-promotion.component';
import { UpdateProfileComponent } from './features/client/update-profile/update-profile.component';
import { UpdateProfilComponent } from './features/installer/update-profil/update-profil.component';
import { BassinImagePipe } from './pipes/bassin-image.pipe';
import { AuthService } from './core/authentication/auth.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TruncatePipe } from './pipes/truncate.pipe';
import { CommandeListeComponent } from './features/admin/commande-liste/commande-liste.component';
import { AffectationDialogComponent } from './features/admin/affectation-dialog/affectation-dialog.component';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MesCommandesComponent } from './features/client/mes-commandes/mes-commandes.component';
import { CardPaymentComponent } from './features/public/card-payment/card-payment.component';
import { CheckoutComponent } from './features/public/checkout/checkout.component';
import { CommandeConfirmationComponent } from './features/public/commande-confirmation/commande-confirmation.component';
import { PaymentVerificationComponent } from './features/public/payment-verification/payment-verification.component';
import { InstallateurCommandesComponent } from './features/installer/installateur-commandes/installateur-commandes.component';
import { InstallateursListeComponent } from './features/admin/installateurs-liste/installateurs-liste.component';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { ReplacePipe } from './pipes/replace.pipe';
import { AffectationCalendarComponent } from './features/admin/affectation-calendar/affectation-calendar.component';
import { UpdateAffectationComponent } from './features/admin/update-affectation/update-affectation.component';
import { TerminerAffectationModalComponent } from './features/installer/terminer-affectation-modal/terminer-affectation-modal.component';
import { EditSpecialtyDialogComponent } from './features/admin/edit-specialty-dialog/edit-specialty-dialog.component';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
//import { MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { LayoutInstallateurComponent } from './features/installer/layout-installateur/layout-installateur.component';
import { ToastComponent } from './toast/toast.component';
import { DetailsCommandeClientComponent } from './features/client/details-commande-client/details-commande-client.component';
import { MessagingContainerComponent } from './features/admin/converstaion/messaging-container/messaging-container.component';
import { MessageComponent } from './features/admin/converstaion/message/message.component';
import { ConversationItemComponent } from './features/admin/converstaion/conversation-item/conversation-item.component';
import { RouterModule } from '@angular/router';


export function tokenGetter() {
  return localStorage.getItem('jwt');
}

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    EditProfileComponent,
    HomePageComponent,

    LoginComponent,
    RegisterComponent,
    VerifEmailComponent,
    ForbiddenComponent,
    SendInstallerInvitationComponent,
    InstallerRegisterComponent,
    InstallerHomeComponent,
    ResetPasswordComponent,
    RequestResetPasswordComponent,
    ValidateCodeComponent,
    BassinComponent,
    AddBassinComponent,
    UpdateBassinComponent,
    DetailsBassinComponent,
    ListCategoriesComponent,
    AddCategorieComponent,
    UpdateCategorieComponent,
    ShopPageComponent,
    LoadingComponent,
    LayoutComponent,
    UsersListComponent,
    GithubToCdnPipe,
    ArViewerComponent,
    BassinDetailComponent,
    BassinPersonnaliseComponent,
    BassinPersonnaliseDetailsComponent,
    BassinPersonnaliseUpdateComponent,
    BassinPersonnaliseClientComponent,
    BassinPersonnaliseArdetailComponent,
    PromotionsListComponent,
    AddPromotionComponent,
    EditPromotionComponent,
    NotificationsComponent,
    StocksListComponent,
    StockActionDialogComponent,
    ToastComponent,
    HeaderComponent,
    FooterComponent,
    CartComponent,
    FavoritesPageComponent,
    AvisComponent,
    UpdateProfileComponent,
    UpdateProfilComponent,
    TruncatePipe,
    CommandeListeComponent,
    AffectationDialogComponent,
    MesCommandesComponent,
    CardPaymentComponent,
    CheckoutComponent,
    CommandeConfirmationComponent,
    PaymentVerificationComponent,
    InstallateurCommandesComponent,
    InstallateursListeComponent,
    ReplacePipe,
    AffectationCalendarComponent,
    UpdateAffectationComponent,
    TerminerAffectationModalComponent,
    EditSpecialtyDialogComponent,
    LayoutInstallateurComponent,
    DetailsCommandeClientComponent,
    MessageComponent,
    MessagingContainerComponent,
    ConversationItemComponent,
  ],
  imports: [
    BrowserModule.withServerTransition({ appId: 'my-angular-app' }),
    AppRoutingModule,
    HttpClientModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,

    MatTableModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    SocialLoginModule,
    BassinImagePipe,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatFormFieldModule,
    ScrollingModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatSortModule,
    FullCalendarModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
LucideAngularModule.pick({ CreditCard, Package2, Users, Wrench, Home, 
  Medal, Calendar, MapPin,CheckCircle,FileText, Hash, Activity, 
  ShoppingCart, Package, BoxSelect, ShoppingBag, Tag, MessageCircle, User, 
 Mail, Send, Smile, Paperclip, 
      UserCog,  
      LoaderCircle }),
   
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
        allowedDomains: ['localhost:8002', 'localhost:8004'],
        disallowedRoutes: [],
      },
    }),
  ],
 providers: [
    // Services
    AuthService,
    DatePipe,
    
    // Intercepteurs HTTP (dans l'ordre d'exécution)
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: AuthInterceptor, 
      multi: true 
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: JwtInterceptor, 
      multi: true 
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: LoadingInterceptor, 
      multi: true 
    },
    { 
      provide: HTTP_INTERCEPTORS, 
      useClass: ErrorInterceptor, 
      multi: true 
    },
    
    // Configuration Auth Sociale
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '133465243893-f4gk1sbs2adeoc4i2sapighi25pai6qt.apps.googleusercontent.com'
            )
          }
        ],
        onError: (err) => {
          console.error('Erreur Auth Sociale:', err);
        }
      } as SocialAuthServiceConfig
    },
    
    // Fournisseurs HttpClient et Animations
    provideHttpClient(
      withFetch(),
      withInterceptorsFromDi() // Pour supporter les intercepteurs basés sur DI
    ),
    provideAnimationsAsync(),
    
    // Optionnel: Hydration (décommenter si nécessaire)
    // provideClientHydration()
],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
