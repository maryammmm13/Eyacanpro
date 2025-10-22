import subprocess

def get_large_files(limit=20):
    # رجع كل الملفات بتاريخ git
    objects = subprocess.check_output(
        "git rev-list --objects --all", shell=True, text=True
    ).splitlines()

    sizes = []
    for obj in objects:
        parts = obj.split()
        if len(parts) < 1:
            continue
        sha = parts[0]
        try:
            size = subprocess.check_output(
                f"git cat-file -s {sha}", shell=True, text=True
            ).strip()
            path = " ".join(parts[1:]) if len(parts) > 1 else "(no path)"
            sizes.append((int(size), path))
        except:
            continue

    # رتب من الأكبر للأصغر
    sizes.sort(reverse=True, key=lambda x: x[0])
    return sizes[:limit]

if __name__ == "__main__":
    big_files = get_large_files()
    for size, path in big_files:
        print(f"{size/1024/1024:.2f} MB\t{path}")
