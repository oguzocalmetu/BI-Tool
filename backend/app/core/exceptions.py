from fastapi import HTTPException, status

class CredentialsException(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )

class PermissionDeniedException(HTTPException):
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class NotFoundException(HTTPException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found")

class QueryValidationError(HTTPException):
    def __init__(self, errors: list):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"errors": errors})

class QueryTimeoutError(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="Query timed out")

class ConnectionError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
