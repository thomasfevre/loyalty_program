use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow occurred.")]
    Overflow,

    #[msg("Only the merchant who owns this card can close it.")]
    Unauthorized,

    #[msg("Token destination account is not owned by the customer.")]
    ConstraintTokenOwner,
} 