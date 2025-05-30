package com.example.orders_microservice.exceptions;

public class CommandeException extends RuntimeException {

	
	  public CommandeException(String message) {
	        super(message);
	    }
	  public CommandeException(String message, Throwable cause) {
	        super(message, cause);
	    }
}
