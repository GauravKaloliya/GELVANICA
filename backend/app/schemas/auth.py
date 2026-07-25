from marshmallow import EXCLUDE, Schema, fields, validate


class RegisterSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(
        required=True,
        validate=[
            validate.Length(min=8, max=128),
            validate.Regexp(
                r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
                error="Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
            ),
        ],
        metadata={"description": "Password with min 8 chars, upper, lower, number, special"}
    )
    name = fields.Str(load_default=None)


class LoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.Str(required=True)


class AuthorizeSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    redirect_uri = fields.Str(required=True)
    state = fields.Str(load_default=None)
    workspace_id = fields.UUID(allow_none=True, load_default=None)


class ExchangeCodeSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    code = fields.Str(required=True, validate=validate.Length(min=10))
    redirect_uri = fields.Str(load_default=None)


class ChangePasswordSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    old_password = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8))


class ForgotPasswordSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)


class ResetPasswordSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    token = fields.Str(required=True)
    new_password = fields.Str(required=True, validate=validate.Length(min=8))


class GoogleLoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    credential = fields.Str(required=True)


class ProfileChangedSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    since = fields.Str(required=True)
