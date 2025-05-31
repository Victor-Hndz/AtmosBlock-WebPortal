import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { UserRole } from "@/shared/enums/userRoleEnum.enum";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { RolesGuard } from "@/auth/guards/roles.guard";
import { RequestsService } from "@/requests/services/requests.service";
import { CreateRequestDto } from "@/requests/dtos/create-request.dto";
import { CurrentUser } from "@/shared/decorators/currentUserDecorator.decorator";
import { ReturnRequestDto } from "../dtos/returnRequestDto.dto";

@ApiTags("requests")
@Controller("requests")
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all requests" })
  @ApiResponse({ status: 200, description: "Return all requests." })
  findAll() {
    return this.requestsService.findAll();
  }

  @Get("my-requests")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user's own requests" })
  @ApiResponse({ status: 200, description: "Return user's requests." })
  async findMyRequests(@CurrentUser("id") userId: string): Promise<ReturnRequestDto[]> {
    const requests = await this.requestsService.findAllByUser(userId);
    const returnResponse = requests.map(request => {
      const returnRequest = new ReturnRequestDto();
      returnRequest.fromRequest(request);
      return returnRequest;
    });
    return returnResponse;
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a request by id" })
  @ApiResponse({ status: 200, description: "Return the request." })
  @ApiResponse({ status: 404, description: "Request not found." })
  findOne(@Param("id") id: string) {
    return this.requestsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new request" })
  @ApiResponse({ status: 201, description: "The request has been successfully created." })
  create(@Body() createRequestDto: CreateRequestDto, @CurrentUser("id") userId: string) {
    createRequestDto.userId = userId;
    return this.requestsService.create(createRequestDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a request" })
  @ApiResponse({ status: 200, description: "The request has been successfully deleted." })
  @ApiResponse({ status: 404, description: "Request not found." })
  remove(@Param("id") id: string) {
    return this.requestsService.remove(id);
  }

  @Post("process")
  @ApiOperation({ summary: "Process a request" })
  @ApiResponse({ status: 201, description: "Request processed successfully." })
  async launchRequest(@Body() request: CreateRequestDto) {
    const response = await this.requestsService.create(request);
    return response;
  }
}
