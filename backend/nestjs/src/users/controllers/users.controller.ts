import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";

@Controller("users")
export class UsersController {
  @Get("profile")
  getProfile(@Req() request: Request) {
    const token = request.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("No token provided");
    }
    // Here you would typically validate the token and fetch the user profile
    // For demonstration purposes, we'll return a mock user profile
    return {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
    };
  }
}
