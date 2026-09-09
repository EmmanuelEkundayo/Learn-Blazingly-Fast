const bash = {
  id: 'bash',
  title: 'Bash / Linux',
  color: 'green',
  category: 'Languages',
  description: 'File operations, permissions, processes, networking, and shell scripting',
  sections: [
    {
      title: 'File Operations',
      items: [
        { label: 'ls - list files', language: 'bash', code: `ls -la\n# -l long format, -a show hidden files\nls -lh     # human-readable file sizes\nls -lt     # sort by modification time\nls -lS     # sort by file size`, note: 'Combine flags: ls -lah shows hidden files with human-readable sizes' },
        { label: 'cd - change directory', language: 'bash', code: `cd /var/log         # absolute path\ncd ../config        # relative: one level up\ncd ~                # home directory\ncd -                # previous directory\ncd                  # also goes to home directory` },
        { label: 'cp - copy files', language: 'bash', code: `cp file.txt backup.txt          # copy file\ncp -r src/ dest/                # copy directory recursively\ncp -p file.txt dest/            # preserve timestamps and permissions\ncp -u *.txt dest/               # copy only if source is newer` },
        { label: 'mv - move or rename', language: 'bash', code: `mv old.txt new.txt              # rename file\nmv file.txt /tmp/               # move to directory\nmv *.log /var/log/archive/      # move multiple files\nmv -n src.txt dest.txt          # do not overwrite existing` },
        { label: 'rm - remove files', language: 'bash', code: `rm file.txt                     # remove file\nrm -rf ./build/                 # remove directory and all contents\nrm -i *.tmp                     # prompt before each deletion\nrm -v file.txt                  # verbose output`, note: 'rm -rf is irreversible. Double-check the path before running.' },
        { label: 'mkdir - create directories', language: 'bash', code: `mkdir new-folder\nmkdir -p /path/to/deep/folder   # create all parent dirs if missing\nmkdir -m 755 public             # create with specific permissions` },
        { label: 'touch - create or update file', language: 'bash', code: `touch file.txt                  # create empty file or update timestamp\ntouch -t 202401011200 file.txt  # set specific timestamp`, note: 'Useful for creating placeholder files or resetting timestamps' },
        { label: 'ln - create symlinks', language: 'bash', code: `ln -s /path/to/original link-name   # create symbolic link\nln -sf /new/target existing-link    # force update existing symlink\nls -la | grep ' -> '                # list all symlinks`, note: 'Symlinks store the path to the target, not the file contents' },
        { label: 'find - search for files', language: 'bash', code: `find . -name "*.log"                    # find by name\nfind /var -type f -mtime -7             # files modified in last 7 days\nfind . -type f -size +10M               # files larger than 10MB\nfind . -name "*.tmp" -exec rm {} \\;    # find and delete\nfind . -maxdepth 2 -name "config.json"  # limit search depth` },
        { label: 'tree - directory structure', language: 'bash', code: `tree\ntree -L 2                   # limit depth to 2 levels\ntree -a                     # include hidden files\ntree -I "node_modules"      # exclude a directory\ntree --dirsfirst            # list directories before files`, note: 'Install with: sudo apt install tree' },
      ]
    },
    {
      title: 'File Viewing',
      items: [
        { label: 'cat - print file contents', language: 'bash', code: `cat file.txt\ncat -n file.txt             # show line numbers\ncat file1.txt file2.txt     # concatenate multiple files\ncat > newfile.txt           # write to file (Ctrl+D to save)` },
        { label: 'less - page through file', language: 'bash', code: `less file.txt\n# Navigation:\n# Space / b  - page forward/backward\n# /pattern   - search forward\n# ?pattern   - search backward\n# n / N      - next / previous match\n# q          - quit`, note: 'less is preferred over more for large files' },
        { label: 'head - show start of file', language: 'bash', code: `head file.txt              # first 10 lines (default)\nhead -n 20 file.txt        # first 20 lines\nhead -c 100 file.txt       # first 100 bytes` },
        { label: 'tail - show end of file', language: 'bash', code: `tail file.txt              # last 10 lines (default)\ntail -n 50 file.txt        # last 50 lines\ntail -f /var/log/syslog    # follow: stream new lines as they appear\ntail -F app.log            # follow by name (reopens if rotated)`, note: 'tail -f is essential for monitoring live logs' },
        { label: 'grep - search inside files', language: 'bash', code: `grep "error" app.log\ngrep -rn "TODO" ./src/          # recursive, show line numbers\ngrep -i "warning" file.txt      # case-insensitive\ngrep -v "debug" app.log         # invert: exclude matching lines\ngrep -c "error" app.log         # count matching lines` },
        { label: 'grep -E - extended regex', language: 'bash', code: `grep -E "error|warn|fatal" app.log     # OR pattern\ngrep -E "^[0-9]{4}-[0-9]{2}" log.txt  # lines starting with date\ngrep -E "https?://" file.txt           # match URLs`, note: 'grep -E is equivalent to egrep' },
        { label: 'wc - word count', language: 'bash', code: `wc -l file.txt             # count lines\nwc -w file.txt             # count words\nwc -c file.txt             # count bytes\nwc -l *.log                # count lines in multiple files\ncat file.txt | wc -l       # pipe into wc` },
        { label: 'diff - compare files', language: 'bash', code: `diff file1.txt file2.txt\ndiff -u file1.txt file2.txt        # unified format (used in git patches)\ndiff -r dir1/ dir2/                # compare directories\ndiff --color=always a.txt b.txt    # colorized output`, note: 'Lines with < come from file1, lines with > come from file2' },
      ]
    },
    {
      title: 'Permissions',
      items: [
        { label: 'chmod - set permissions with octal', language: 'bash', code: `chmod 755 script.sh     # rwxr-xr-x: owner full, group+others read/execute\nchmod 644 file.txt      # rw-r--r--: owner read/write, others read only\nchmod 600 secret.key    # rw-------: owner read/write only\nchmod 777 file          # rwxrwxrwx: full permissions for everyone`, note: '4=read, 2=write, 1=execute. Add values for each group: owner, group, others' },
        { label: 'chmod - symbolic mode', language: 'bash', code: `chmod +x script.sh          # add execute for all\nchmod u+x script.sh         # add execute for owner only\nchmod g-w file.txt          # remove write from group\nchmod o=r file.txt          # set others to read only\nchmod a+r file.txt          # add read for all (a = all)` },
        { label: 'chown - change ownership', language: 'bash', code: `chown alice file.txt            # change owner\nchown alice:developers file.txt  # change owner and group\nchown -R www-data:www-data /var/www/  # recursive\nchown :staff file.txt           # change group only`, note: 'Requires sudo or root privileges' },
        { label: 'umask - default permission mask', language: 'bash', code: `umask                  # show current mask (e.g. 0022)\numask 027              # new files: 640, new dirs: 750\n# File default is 666, dir default is 777\n# umask 022: files=644 (666-022), dirs=755 (777-022)`, note: 'umask bits are subtracted from default permissions' },
        { label: 'ls -la output explained', language: 'bash', code: `# -rwxr-xr-x  1  alice  staff  4096  Jan 10 12:00  script.sh\n#  ^^^^^^^^^  ^  ^^^^^  ^^^^^  ^^^^  ^^^^^^^^^^^^  ^^^^^^^^^^\n#  type+perms links owner  group  size  modified     filename\n\n# Permission groups: [type][owner][group][others]\n# d = directory, - = file, l = symlink` },
        { label: 'setuid and setgid', language: 'bash', code: `chmod u+s /usr/bin/program    # setuid: run as file owner\nchmod g+s /shared/dir/        # setgid: new files inherit group\nchmod +t /tmp/                # sticky bit: only owner can delete\nls -la /usr/bin/sudo          # shows: -rwsr-xr-x (s = setuid)`, note: 'Setuid on directories is ignored on Linux; use setgid for shared dirs' },
      ]
    },
    {
      title: 'Process Management',
      items: [
        { label: 'ps - list processes', language: 'bash', code: `ps aux\n# a = all users, u = user format, x = include no-tty\nps aux | grep nginx         # find specific process\nps -ef                      # full format listing\nps --sort=-%cpu | head -10  # top CPU consumers` },
        { label: 'kill - send signals', language: 'bash', code: `kill 1234               # send SIGTERM (graceful shutdown)\nkill -9 1234            # send SIGKILL (force kill)\nkill -HUP 1234          # send SIGHUP (reload config)\nkillall nginx           # kill by process name\npkill -f "python app.py"  # kill by command pattern`, note: 'Always try SIGTERM before SIGKILL to allow cleanup' },
        { label: 'top / htop - monitor processes', language: 'bash', code: `top\n# Keys in top:\n# P = sort by CPU, M = sort by memory\n# k = kill a process, q = quit\n# 1 = show individual CPU cores\n\nhtop    # interactive, color UI (install separately)`, note: 'htop is much more user-friendly than top' },
        { label: 'Background jobs', language: 'bash', code: `command &               # run in background immediately\nCtrl+Z                  # suspend current foreground job\nbg                      # resume suspended job in background\nbg %2                   # resume job number 2 in background\nfg                      # bring background job to foreground\nfg %1                   # bring job 1 to foreground\njobs                    # list all background/suspended jobs` },
        { label: 'nohup - survive logout', language: 'bash', code: `nohup ./script.sh &                     # run immune to hangup\nnohup python server.py > out.log 2>&1 &  # capture all output\n# Output goes to nohup.out by default`, note: 'Use nohup when you need a process to keep running after SSH disconnect' },
        { label: 'systemctl - manage services', language: 'bash', code: `sudo systemctl start nginx\nsudo systemctl stop nginx\nsudo systemctl restart nginx\nsudo systemctl reload nginx        # reload config without stopping\nsudo systemctl status nginx\nsudo systemctl enable nginx        # start on boot\nsudo systemctl disable nginx\nsystemctl list-units --type=service`, note: 'enable/disable controls auto-start at boot, start/stop is immediate' },
      ]
    },
    {
      title: 'Networking',
      items: [
        { label: 'curl - HTTP requests', language: 'bash', code: `curl https://api.example.com/users\ncurl -X POST https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer TOKEN" \\\n  -d '{"name": "Alice", "email": "alice@example.com"}'\ncurl -o output.html https://example.com    # save to file\ncurl -I https://example.com               # headers only\ncurl -L https://example.com              # follow redirects`, note: '-s for silent mode, -v for verbose (debug headers)' },
        { label: 'wget - download files', language: 'bash', code: `wget https://example.com/file.tar.gz\nwget -O output.tar.gz https://example.com/file.tar.gz  # rename\nwget -c https://example.com/large.zip  # resume interrupted download\nwget -r -np https://example.com/docs/  # recursive download`, note: 'wget is better than curl for downloading files recursively' },
        { label: 'netstat - network connections', language: 'bash', code: `netstat -tulpn\n# -t tcp, -u udp, -l listening, -p show PID, -n numeric\nnetstat -an | grep :80          # find what is using port 80\nnetstat -s                      # network statistics summary`, note: 'netstat may not be installed; use ss as the modern replacement' },
        { label: 'ss - socket statistics', language: 'bash', code: `ss -tulpn\n# -t tcp, -u udp, -l listening, -p show process, -n numeric\nss -s                           # summary\nss -tulpn | grep :443           # what is listening on port 443\nss state established            # established connections only`, note: 'ss is the modern replacement for netstat and is faster' },
        { label: 'ping - test connectivity', language: 'bash', code: `ping google.com\nping -c 4 8.8.8.8       # send only 4 packets\nping -i 0.5 host        # interval 0.5 seconds\nping6 ipv6.google.com   # ping IPv6 host` },
        { label: 'ssh - remote login', language: 'bash', code: `ssh user@host\nssh -p 2222 user@host           # custom port\nssh -i ~/.ssh/id_rsa user@host  # specify key\nssh -L 8080:localhost:80 user@host  # local port forward\nssh -N -f user@host -L 5432:db:5432  # background tunnel only` },
        { label: 'scp - secure copy', language: 'bash', code: `scp file.txt user@host:/remote/path/\nscp user@host:/remote/file.txt ./local/\nscp -r ./project/ user@host:~/\nscp -P 2222 file.txt user@host:~/  # custom port` },
        { label: 'nc - netcat', language: 'bash', code: `nc -zv host 80             # check if port is open\nnc -l 8080                 # listen on port 8080\nnc host 8080               # connect to host:8080\necho "Hello" | nc host 9000  # send data\nnc -u host 5005            # UDP mode`, note: 'nc is a versatile raw TCP/UDP tool useful for debugging and port scanning' },
      ]
    },
    {
      title: 'Archives',
      items: [
        { label: 'tar - create archive', language: 'bash', code: `tar -czvf archive.tar.gz ./folder/\n# -c create, -z gzip compress, -v verbose, -f specify file\ntar -cjvf archive.tar.bz2 ./folder/   # bzip2 compression\ntar -cJvf archive.tar.xz ./folder/    # xz compression` },
        { label: 'tar - extract archive', language: 'bash', code: `tar -xzvf archive.tar.gz\ntar -xzvf archive.tar.gz -C /target/dir/  # extract to specific dir\ntar -xjvf archive.tar.bz2\ntar -xJvf archive.tar.xz` },
        { label: 'tar - list contents', language: 'bash', code: `tar -tzf archive.tar.gz           # list contents of gzip tar\ntar -tjf archive.tar.bz2          # list contents of bzip2 tar\ntar -tf archive.tar               # list uncompressed tar`, note: 'Use -t to preview archive contents before extracting' },
        { label: 'zip / unzip', language: 'bash', code: `zip archive.zip file1.txt file2.txt\nzip -r archive.zip ./folder/           # recursive\nzip -e secure.zip file.txt             # encrypt with password\n\nunzip archive.zip\nunzip archive.zip -d /target/dir/      # extract to directory\nunzip -l archive.zip                   # list contents without extracting` },
        { label: 'gzip / gunzip', language: 'bash', code: `gzip file.txt               # compress: creates file.txt.gz, removes original\ngzip -k file.txt            # keep original file\ngzip -d file.txt.gz         # decompress\ngunzip file.txt.gz          # same as gzip -d\ngzip -9 file.txt            # maximum compression`, note: 'gzip compresses single files only; use tar to bundle a directory first' },
        { label: 'Extract any archive - quick reference', language: 'bash', code: `tar -xzvf file.tar.gz\ntar -xjvf file.tar.bz2\ntar -xJvf file.tar.xz\nunzip file.zip\ngunzip file.gz\nbunzip2 file.bz2\nxz -d file.xz` },
      ]
    },
    {
      title: 'Text Processing',
      items: [
        { label: 'awk - field processing', language: 'bash', code: `awk '{print $1}' file.txt              # print first field\nawk '{print $1, $3}' file.txt          # print fields 1 and 3\nawk -F: '{print $1}' /etc/passwd       # custom delimiter\nawk '{sum += $2} END {print sum}' data.txt  # sum a column\nawk 'NR > 1 {print}' file.txt          # skip header line`, note: 'awk splits lines into fields separated by whitespace by default' },
        { label: 'sed - stream editor', language: 'bash', code: `sed 's/old/new/' file.txt              # replace first occurrence per line\nsed 's/old/new/g' file.txt             # replace all occurrences\nsed -i 's/old/new/g' file.txt          # in-place edit\nsed -i.bak 's/old/new/g' file.txt      # in-place with backup\nsed '/^#/d' file.txt                   # delete comment lines\nsed -n '10,20p' file.txt               # print lines 10 to 20`, note: 'Always test without -i first to verify the substitution is correct' },
        { label: 'cut - extract columns', language: 'bash', code: `cut -d',' -f1 file.csv              # first CSV column\ncut -d':' -f1,7 /etc/passwd         # fields 1 and 7 with : delimiter\ncut -c1-10 file.txt                 # characters 1 to 10\ncut -d' ' -f2- file.txt             # from field 2 to end`, note: 'cut works on fixed delimiters; use awk for more flexible parsing' },
        { label: 'sort - sort lines', language: 'bash', code: `sort file.txt                       # alphabetical sort\nsort -n numbers.txt                 # numeric sort\nsort -rn numbers.txt                # reverse numeric sort\nsort -k2 file.txt                   # sort by second field\nsort -t',' -k3 -n data.csv          # sort CSV by third field numerically`, note: 'sort is stable: equal keys keep original order with GNU sort -s' },
        { label: 'sort -u and uniq', language: 'bash', code: `sort -u file.txt                    # sort and remove duplicates\nsort file.txt | uniq                # same result\nsort file.txt | uniq -c             # count occurrences\nsort file.txt | uniq -d             # show only duplicate lines\nsort file.txt | uniq -u             # show only unique lines` },
        { label: 'tr - translate characters', language: 'bash', code: `echo "hello" | tr 'a-z' 'A-Z'      # uppercase\necho "hello world" | tr ' ' '_'    # replace spaces with underscore\ncat file.txt | tr -d '\\r'          # remove carriage returns\necho "aabbcc" | tr -s 'a-z'        # squeeze repeated chars` },
      ]
    },
    {
      title: 'Environment and Variables',
      items: [
        { label: 'export - set environment variables', language: 'bash', code: `export MY_VAR="hello"\nexport PATH="$PATH:/usr/local/bin"\nexport -p                          # list all exported variables`, note: 'Variables set without export are local to the current shell only' },
        { label: 'env and printenv', language: 'bash', code: `env                                # print all environment variables\nprintenv HOME                      # print a specific variable\nprintenv PATH\nenv -i command                     # run command with empty environment` },
        { label: 'source - reload config', language: 'bash', code: `source ~/.bashrc\nsource ~/.bash_profile\n. ~/.profile                       # dot is equivalent to source`, note: 'source runs the file in the current shell; exiting sub-shells would lose changes' },
        { label: 'Special variables', language: 'bash', code: `echo $HOME          # home directory\necho $PATH          # executable search path\necho $USER          # current username\necho $PWD           # current directory\necho $SHELL         # current shell` },
        { label: 'Exit code and process variables', language: 'bash', code: `echo $?             # exit code of last command (0 = success)\necho $$             # PID of current shell\necho $!             # PID of last background process\necho $0             # name of current script\necho $#             # number of arguments passed to script`, note: '$? is essential for error handling in scripts' },
        { label: 'Parameter expansion', language: 'bash', code: `NAME="world"\necho "Hello \${NAME}"\necho \${NAME:-"default"}            # use default if unset\necho \${NAME:="default"}            # assign default if unset\necho \${#NAME}                      # length of variable\necho \${NAME^^}                     # uppercase (bash 4+)\necho \${NAME:0:3}                   # substring: first 3 chars` },
      ]
    },
    {
      title: 'Disk and Memory',
      items: [
        { label: 'df - disk usage by filesystem', language: 'bash', code: `df -h\n# -h human-readable (KB, MB, GB)\ndf -h /var/log        # specific mount point\ndf -T                 # show filesystem type\ndf -i                 # show inode usage`, note: 'df shows space per mounted filesystem, not per directory' },
        { label: 'du - disk usage by directory', language: 'bash', code: `du -sh /var/log\n# -s summary total, -h human-readable\ndu -sh /*                          # top-level directories\ndu -h --max-depth=1 /var\ndu -sh * | sort -h                 # sorted by size`, note: 'Use du to find which directories are consuming the most space' },
        { label: 'free - memory usage', language: 'bash', code: `free -h\n# Shows total, used, free, shared, buff/cache, available\nfree -m               # in megabytes\nfree -s 2             # update every 2 seconds`, note: '"available" is the amount usable by new processes, not just "free"' },
        { label: 'lsblk - list block devices', language: 'bash', code: `lsblk\nlsblk -f              # show filesystem type and UUID\nlsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT`, note: 'Shows disk devices and partitions in a tree view' },
        { label: 'mount - attach filesystems', language: 'bash', code: `mount                                   # list all mounted filesystems\nsudo mount /dev/sdb1 /mnt/usb           # mount a device\nsudo mount -t ext4 /dev/sdb1 /mnt/data  # specify filesystem type\nsudo umount /mnt/usb                    # unmount` },
        { label: 'iostat - I/O statistics', language: 'bash', code: `iostat\niostat -x 2 5          # extended stats, every 2s, 5 times\niostat -d              # disk stats only\niostat -c              # CPU stats only`, note: 'Install via sysstat package: sudo apt install sysstat' },
        { label: 'vmstat - virtual memory stats', language: 'bash', code: `vmstat\nvmstat 2 10            # update every 2s, 10 times\nvmstat -s              # memory statistics summary\nvmstat -d              # disk statistics`, note: 'vmstat columns: r=runnable, b=blocked, si/so=swap in/out, us=user, sy=system, id=idle' },
      ]
    },
    {
      title: 'Cron Jobs',
      items: [
        { label: 'crontab - edit jobs', language: 'bash', code: `crontab -e             # edit current user crontab\nsudo crontab -e -u www-data  # edit another user crontab\ncrontab -l             # list current user cron jobs\ncrontab -r             # remove all cron jobs (dangerous)` },
        { label: 'Cron syntax', language: 'bash', code: `# .---------------- minute (0-59)\n# |  .------------- hour (0-23)\n# |  |  .---------- day of month (1-31)\n# |  |  |  .------- month (1-12)\n# |  |  |  |  .---- day of week (0-7, 0 and 7 = Sunday)\n# |  |  |  |  |\n# *  *  *  *  *  command`, note: 'Comma separates values, hyphen defines range, slash defines step' },
        { label: 'Common cron schedules', language: 'bash', code: `0 * * * *    /script.sh     # every hour (at minute 0)\n0 2 * * *    /backup.sh     # every day at 2:00 AM\n0 2 * * 0    /weekly.sh     # every Sunday at 2:00 AM\n0 2 1 * *    /monthly.sh    # first day of month at 2:00 AM\n*/5 * * * *  /check.sh      # every 5 minutes` },
        { label: 'Shorthand schedule names', language: 'bash', code: `@reboot    /startup.sh       # run once at system boot\n@hourly    /script.sh        # same as 0 * * * *\n@daily     /daily.sh         # same as 0 0 * * *\n@weekly    /weekly.sh        # same as 0 0 * * 0\n@monthly   /monthly.sh       # same as 0 0 1 * *\n@yearly    /yearly.sh        # same as 0 0 1 1 *`, note: '@reboot is useful for starting services or setting up the environment at boot' },
        { label: 'Cron output and logging', language: 'bash', code: `# Redirect all output to a log file\n0 2 * * * /backup.sh >> /var/log/backup.log 2>&1\n\n# Suppress all output (silent)\n0 * * * * /script.sh > /dev/null 2>&1\n\n# Check cron log\nsudo grep CRON /var/log/syslog | tail -20`, note: 'By default cron emails output to the user. Redirect to file to avoid mail buildup.' },
        { label: 'Environment in cron', language: 'bash', code: `# Cron runs with minimal environment. Set vars at the top of crontab:\nSHELL=/bin/bash\nPATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\nMAILTO=""          # disable email notifications\n\n# Use absolute paths for commands in cron jobs\n0 2 * * * /usr/bin/python3 /home/user/script.py`, note: 'The $PATH in cron is very limited. Always use full absolute paths.' },
      ]
    },
  ]
}

export default bash
