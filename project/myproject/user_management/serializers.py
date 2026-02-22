"""Re-export user serializer from main serializers to avoid duplication."""
from myproject.serializers import UserSerializer

__all__ = ["UserSerializer"]
