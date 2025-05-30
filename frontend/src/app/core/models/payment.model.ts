export interface PaymentRequest {
  commandeId: string;
  email: string;
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  commandeId: string;
  message: string;
}

export interface CodeVerificationRequest {
  transactionId: string;
  verificationCode: string;
}

export interface PaymentValidationResponse {
  success: boolean;
  message: string;
  commandeId: string;
  referencePaiement: string;
}

export enum StatutCommande {
  EN_ATTENTE = 'EN_ATTENTE',
  EN_PREPARATION = 'EN_PREPARATION',
  AFFECTE = 'AFFECTE',
  INSTALLATION_TERMINEE = 'INSTALLATION_TERMINEE',
  ECHEC = 'ECHEC',
  VALIDEE = 'VALIDEE',
}

export enum ModePaiement {
  CARTE_BANCAIRE = 'CARTE_BANCAIRE',
}