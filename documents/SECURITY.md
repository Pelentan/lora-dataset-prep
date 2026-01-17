# Security Scanning

This repository uses automated security scanning to detect vulnerabilities in both the Go backend and React frontend.

## What's Scanning

**CodeQL** automatically scans for:
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Path traversal attacks
- Command injection
- Hardcoded secrets/credentials
- Insecure randomness
- Unsafe deserialization
- Authentication bypass
- Information disclosure
- And 100+ other vulnerability patterns

**Dependabot** (enabled automatically by GitHub) watches for:
- Known CVEs in Go modules
- Known CVEs in npm packages
- Outdated dependencies with security patches

## When Scans Run

**Automatically:**
- Every push to `main`, `master`, or `develop` branches
- Every pull request
- Weekly on Mondays at 6 AM UTC (scheduled scan)

**Manually:**
- Navigate to **Actions** tab → **CodeQL Security Analysis** → **Run workflow**

## How PR Blocking Works

### Critical Issues = PR Blocked ❌

If **critical severity** vulnerabilities are found, the PR will:
1. Fail the security check
2. Show a red ❌ status
3. Post a comment with issue count
4. **Block merging** until fixed

### High Issues = Warning Only ⚠️

High severity issues are reported but don't block the PR by default.

**To also block on high severity issues:**
1. Edit `.github/workflows/codeql.yml`
2. Uncomment these lines (around line 105):
   ```yaml
   # if [ $HIGH_COUNT -gt 0 ]; then
   #   echo "❌ HIGH severity security issues detected! PR blocked."
   #   exit 1
   # fi
   ```

## Viewing Results

### Security Tab

1. Go to repository **Security** tab
2. Click **Code scanning alerts**
3. Filter by severity, language, or status
4. Click any alert for details and fix recommendations

### Pull Request Comments

The bot automatically comments on PRs with:
- ✅ or ❌ status
- Count of critical/high issues
- Link to detailed findings

### Action Summary

Each workflow run shows:
- Languages scanned
- Scan status
- Link to detailed SARIF results

## Understanding Severity Levels

GitHub/CodeQL uses these severity levels:

**Critical** 🔴
- Remote code execution
- SQL injection
- Authentication bypass
- Immediate action required

**High** 🟠
- XSS vulnerabilities
- Path traversal
- Information disclosure
- Fix soon

**Medium** 🟡
- Potential security issues
- Best practice violations
- Fix when convenient

**Low** ⚪
- Code quality issues
- Minor improvements
- Optional fixes

## Common False Positives

CodeQL is conservative and may flag non-issues:

**"Potential SQL Injection" in parameterized queries:**
- If you're using sqlx with named parameters (`:name`), this is safe
- Mark as false positive in Security tab

**"XSS" in React components:**
- React auto-escapes by default
- Only real issue if using `dangerouslySetInnerHTML`

**"Unvalidated Redirect" in Chi routes:**
- If you control all routes, this is usually safe
- Review the specific case

## Fixing Issues

1. **View the alert** in Security tab
2. **Read the recommendation** - CodeQL often suggests fixes
3. **Fix the code** and push
4. **Re-scan automatically** on next push
5. **Close the alert** - it auto-closes when fixed

## Disabling for Development

If you need to merge something urgently with known issues:

**Option 1: Use Admin Override**
- Repository settings → Branches → Edit branch protection
- Temporarily disable "Require status checks to pass"

**Option 2: Mark as False Positive**
- Go to Security tab
- Click the alert
- Click "Close as" → "False positive"
- Add a comment explaining why

⚠️ **Never** disable security scanning permanently!

## Best Practices

✅ **Fix critical issues immediately**  
✅ **Review all alerts, don't auto-dismiss**  
✅ **Keep dependencies updated** (Dependabot PRs)  
✅ **Use parameterized queries** (never string concatenation)  
✅ **Sanitize user input**  
✅ **Use HTTPS for external APIs**  
✅ **Don't commit secrets** (use environment variables)  

## Adding Custom Rules

Want to scan for project-specific patterns?

1. Create `.github/codeql/custom-queries.ql`
2. Update workflow to include custom queries:
   ```yaml
   queries: security-and-quality, .github/codeql/custom-queries.ql
   ```

See [CodeQL documentation](https://codeql.github.com/docs/) for query syntax.

## Performance

**First run:** 5-10 minutes (builds code, indexes everything)  
**Subsequent runs:** 2-5 minutes (incremental analysis)  

**Optimization tips:**
- Scan runs in parallel for Go and JavaScript
- Uses GitHub's caching automatically
- Only scans changed files in PRs (smart)

## Troubleshooting

**"Autobuild failed"**
- Check if Go code compiles locally: `go build ./...`
- Missing dependencies? Run: `go mod download`

**"Analysis failed"**
- Check workflow logs in Actions tab
- Usually means code doesn't compile

**"Rate limit exceeded"**
- GitHub Actions has limits on free tier
- Scan less frequently or upgrade plan

## GitHub Security Tab Access

**Who can see security alerts:**
- Repository admins (always)
- Users with "Security" permissions
- Public repos: Anyone (alerts are public)

**Who can dismiss alerts:**
- Repository admins
- Users with "Security" write permissions

## Additional Security Tools

Consider adding:

**Trivy** - Scan Docker images
```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'your-image:tag'
    format: 'sarif'
```

**Go Security Checker (gosec)**
```yaml
- uses: securego/gosec@master
  with:
    args: './...'
```

**npm audit** (already in package.json)
```bash
npm audit --audit-level=high
```

## Support

- [CodeQL Documentation](https://codeql.github.com/docs/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Remember:** Security scanning is a tool, not a replacement for security-conscious development. Always review code for logical security issues that scanners can't detect.
