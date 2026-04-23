"""
usage: python scripts/rmpyc.py [Directory]
"""

import os

from sys import argv, exit

from typing import Tuple


def rm_pycache(path: str) -> Tuple[int, int]:
    """
    Find and remove all of the __pycache__ directories and the pycache files they contain.

    :param path: The root directory
    :type path: str
    :return: number of (directories, files) removed
    :rtype: Tuple[int, int]
    """
    _pyc_dir_count, _pyc_fi_count = 0, 0
    _tempdir_count, _tempfi_count = 0, 0
    _temp_path = ""

    for _fi in os.listdir(path):
        _temp_path = os.path.join(path, _fi)

        if os.path.isdir(_temp_path):
            _tempdir_count, _tempfi_count = rm_pycache(_temp_path)
            if _fi == "__pycache__":
                _tempdir_count += 1
                try:
                    os.rmdir(_temp_path)
                except OSError:
                    print(f'Failed to remove directory "{_temp_path}"')
            _pyc_dir_count += _tempdir_count
            _pyc_fi_count += _tempfi_count

        elif _fi[-4:] == ".pyc":
            try:
                os.remove(_temp_path)
                _pyc_fi_count += 1
            except OSError:
                print(f'Failed to remove file "{_temp_path}"')

    return (_pyc_dir_count, _pyc_fi_count)


if __name__ == "__main__":
    path = ""
    if len(argv) > 1:
        if os.path.exists(argv[1]):
            if not os.path.isdir(argv[1]):
                print("Given path must be a directory.")
                exit()
            path = argv[1]
        else:
            raise FileNotFoundError
    else:
        path = "."

    dir_count, fi_count = rm_pycache(path)
    print(f"{dir_count} __pycache__ directories found and removed.")
    print(f"{fi_count} pycache files cleaned.")
