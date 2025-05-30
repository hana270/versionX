// user.model.ts
export class User {
    user_id: number = 0;  // Changé de optionnel à requis avec valeur par défaut
    username: string = '';
    password?: string = '';
    email: string = '';
    enabled: boolean = false;
    firstName: string = '';
    lastName: string = '';
    phone: string = '';
    defaultAddress: string = '';
    profileImage: string = 'assets/images/default-image-profile.webp';
    resetToken?: string;
    validationCode?: string;
    roles: any[] = [];
    jwtToken?: string;
    specialty?: string;
  
    // Constructeur inchangé
    constructor(user_id?: number) {
      if (user_id) {
        this.user_id = user_id;
      }
      this.username = '';
      this.email = '';
      this.password = '';
      this.firstName = '';
      this.lastName = '';
      this.phone = '';
      this.defaultAddress = '';
    }
  }