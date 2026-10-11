package com.medicareai.serviceimpl;

import com.medicareai.dto.AuthResponse;
import com.medicareai.dto.LoginRequest;
import com.medicareai.dto.RegisterRequest;
import com.medicareai.entity.Doctor;
import com.medicareai.entity.Patient;
import com.medicareai.entity.Role;
import com.medicareai.entity.User;
import com.medicareai.exception.DuplicateResourceException;
import com.medicareai.exception.ResourceNotFoundException;
import com.medicareai.repository.DoctorRepository;
import com.medicareai.repository.PatientRepository;
import com.medicareai.repository.RoleRepository;
import com.medicareai.repository.UserRepository;
import com.medicareai.security.JwtUtil;
import com.medicareai.security.UserPrincipal;
import com.medicareai.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("An account with this email already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRole()));

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(role)
                .build();

        user = userRepository.save(user);

        // Create the role-specific profile row so Patient/Doctor management
        // pages immediately have a record to attach data to.
        if (Role.PATIENT.equals(role.getName())) {
            Patient patient = Patient.builder().user(user).build();
            patientRepository.save(patient);
        } else if (Role.DOCTOR.equals(role.getName())) {
            Doctor doctor = Doctor.builder()
                    .user(user)
                    .specialization("General Physician")
                    .build();
            doctorRepository.save(doctor);
        }

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtUtil.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(role.getName())
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtUtil.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().getName())
                .build();
    }
}
