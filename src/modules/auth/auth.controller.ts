import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ResponseMessage } from "../../common/decorators/response-message.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { AuthService } from "./auth.service";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterStudentDto } from "./dto/register-student.dto";
import { StudentLoginDto } from "./dto/student-login.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ResponseMessage("Login berhasil.")
  @ApiOkResponse({ description: "Login admin/guru berhasil." })
  @ApiUnauthorizedResponse({ description: "Email atau password tidak valid." })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("student-login")
  @ResponseMessage("Login siswa berhasil.")
  @ApiOkResponse({ description: "Login siswa berhasil." })
  @ApiUnauthorizedResponse({ description: "Kode peserta tidak valid." })
  studentLogin(@Body() dto: StudentLoginDto) {
    return this.authService.studentLogin(dto);
  }

  @Post("register")
  @ResponseMessage("Registrasi berhasil.")
  @ApiOkResponse({ description: "Registrasi siswa dengan email+password berhasil." })
  registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto);
  }

  @Post("google")
  @ResponseMessage("Login dengan Google berhasil.")
  @ApiOkResponse({ description: "Login/registrasi siswa lewat Google berhasil." })
  @ApiUnauthorizedResponse({ description: "Token Google tidak valid." })
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage("Profil user berhasil diambil.")
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.authService.getMe(currentUser);
  }

  @Post("refresh")
  @ResponseMessage("Refresh token belum diaktifkan.")
  refresh() {
    return {
      status: "not_implemented",
    };
  }

  @Post("logout")
  @ResponseMessage("Logout berhasil.")
  logout() {
    return {
      status: "ok",
    };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ResponseMessage("Change password belum diaktifkan.")
  changePassword() {
    return {
      status: "not_implemented",
    };
  }
}

