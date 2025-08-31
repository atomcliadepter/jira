# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.8.x   | :white_check_mark: |
| 1.7.x   | :white_check_mark: |
| < 1.7   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public GitHub issue

Security vulnerabilities should be reported privately to allow us to fix them before public disclosure.

### 2. Report via GitHub Security Advisories

1. Go to the [Security tab](https://github.com/atomcliadepter/jira/security) of this repository
2. Click "Report a vulnerability"
3. Fill out the vulnerability report form with:
   - Detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes or mitigations

### 3. Alternative Reporting Methods

If GitHub Security Advisories are not available, you can report vulnerabilities via:
- Email: security@example.com (replace with actual contact)
- Encrypted communication preferred

## What to Include in Your Report

Please provide as much information as possible:

- **Description**: Clear description of the vulnerability
- **Impact**: What could an attacker accomplish?
- **Reproduction**: Step-by-step instructions to reproduce
- **Environment**: Version, configuration, environment details
- **Evidence**: Screenshots, logs, or proof-of-concept code
- **Suggested Fix**: If you have ideas for remediation

## Response Timeline

- **Initial Response**: Within 48 hours
- **Triage**: Within 5 business days
- **Status Updates**: Weekly until resolved
- **Fix Timeline**: Varies by severity (see below)

## Severity Levels

### Critical (CVSS 9.0-10.0)
- **Response**: Immediate (within 24 hours)
- **Fix Target**: 7 days
- **Examples**: Remote code execution, authentication bypass

### High (CVSS 7.0-8.9)
- **Response**: Within 48 hours
- **Fix Target**: 30 days
- **Examples**: Privilege escalation, data exposure

### Medium (CVSS 4.0-6.9)
- **Response**: Within 5 days
- **Fix Target**: 90 days
- **Examples**: Information disclosure, DoS

### Low (CVSS 0.1-3.9)
- **Response**: Within 10 days
- **Fix Target**: Next major release
- **Examples**: Minor information leaks

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest supported version
2. **Secure Configuration**: Follow security guidelines in documentation
3. **Access Control**: Use proper authentication and authorization
4. **Network Security**: Deploy behind firewalls and use HTTPS
5. **Monitoring**: Enable audit logging and monitor for suspicious activity

### For Developers

1. **Input Validation**: All inputs must be validated and sanitized
2. **Authentication**: Use secure authentication mechanisms (OAuth 2.0)
3. **Authorization**: Implement proper access controls
4. **Secrets Management**: Never commit secrets to version control
5. **Dependencies**: Keep dependencies updated and scan for vulnerabilities

## Security Features

The Enhanced MCP Jira REST Server includes:

- **OAuth 2.0 Authentication**: Secure authentication with token refresh
- **Permission System**: Role-based access control for tools
- **Input Sanitization**: XSS and injection prevention
- **Audit Logging**: Comprehensive security event tracking
- **Rate Limiting**: Protection against abuse and DoS attacks
- **HTTPS Enforcement**: Secure communication requirements

## Vulnerability Disclosure Policy

We follow responsible disclosure:

1. **Private Reporting**: Report vulnerabilities privately first
2. **Coordinated Disclosure**: Work with us on timing of public disclosure
3. **Credit**: We will credit researchers in security advisories (if desired)
4. **No Legal Action**: We will not pursue legal action against good-faith security researchers

## Security Hall of Fame

We recognize security researchers who help improve our security:

<!-- Future security researchers will be listed here -->

## Contact

For security-related questions or concerns:
- Security Team: security@example.com
- GitHub Security: Use repository security tab
- General Questions: Open a GitHub Discussion

## Legal

This security policy is subject to our terms of service and applicable laws. We reserve the right to modify this policy at any time.
