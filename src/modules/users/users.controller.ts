import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersQueryDto } from "./dto/users-query.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { LearningHistoryQueryDto } from "./dto/learning-history-query.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ResponseMessage("Data user berhasil diambil.")
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get("history")
  @ResponseMessage("History belajar berhasil diambil.")
  findLearningHistory(@Query() query: LearningHistoryQueryDto) {
    return this.usersService.findLearningHistory(query);
  }

  @Get(":id/history")
  @ResponseMessage("History belajar user berhasil diambil.")
  findHistory(@Param("id") id: string) {
    return this.usersService.findHistory(id);
  }

  @Post()
  @ResponseMessage("User berhasil dibuat.")
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @ResponseMessage("User berhasil diperbarui.")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  @ResponseMessage("User berhasil dihapus.")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
